// Defaults assets
let DEFAULT_BIRD = "assets/jd.png";
let DEFAULT_PIPE = "assets/cat.png";

// Relevent non-game interactive elements
let birdpreview = document.querySelector('#bird-img');
let pipepreview = document.querySelector('#pipe-img');
let birdinput = document.querySelector('#bird-input input');
let pipeinput = document.querySelector('#pipe-input input');
let workArea = document.querySelector('#resize-area');
let startButton = document.querySelector('#start-button')

// Set previews to default assets
// Manually set the widths because they end up resizing to fill extra horizontal space on load
birdpreview.src = DEFAULT_BIRD;
birdpreview.width = birdpreview.naturalWidth;
pipepreview.src = DEFAULT_PIPE;
pipepreview.width = pipepreview.naturalWidth;

// Listeners for setting custom assets
function handleFiles(inputPreview, event) {
    // Place images in their own objects to pass to the canvas later    
    inputPreview.src = window.URL.createObjectURL(this.files[0]);
    inputPreview.width = inputPreview.naturalWidth;
    inputPreview.height = inputPreview.naturalHeight;
}

function sizify(dWidth, dHeight, canvas, event) {
    // Basically taking binary data from the canvas and passing that data to the preview
    canvas.width = dWidth;
    canvas.height = dHeight;
    canvas.getContext('2d').drawImage(this, 0, 0, dWidth, dHeight);
    let data = canvas.toDataURL('image/png');
    if (data == event.target.src) return;
    event.target.src = data;
}

// Register listeners
birdinput.addEventListener('change', handleFiles.bind(birdinput, birdpreview), false);
pipeinput.addEventListener('change', handleFiles.bind(pipeinput, pipepreview), false);
birdpreview.addEventListener('load', sizify.bind(birdpreview, 50, 50, workArea), false);
pipepreview.addEventListener('load', sizify.bind(pipepreview, 60, 60, workArea), false);
startButton.addEventListener('click', startGame, false);

// Create our 'main' state that will contain the game
var mainState = function (birdURL, pipeURL) {
    return {
        preload: function () {
            // This function will be executed at the beginning
            // That's where we load the images and sounds

            // Load the bird and pipe sprites
            game.load.image("bird", birdURL);
            game.load.image("pipe", pipeURL);

            // Load the sound effects
            game.load.audio('jump', 'assets/retro-jump.wav'); 
            game.load.audio('gameover', 'assets/negative-beeps.wav');
        },

        create: function () {
            // This function is called after the preload function
            // Here we set up the game, display sprites, etc.

            // Add the sound effects
            this.jumpSound = game.add.audio('jump'); 
            this.gameOverSound = game.add.audio('gameover');

            // Create an empty group
            this.pipes = game.add.group();

            // Add pipes to the game, every 1.5 seconds
            this.timer = game.time.events.loop(1500, this.addRowOfPipes, this);

            // Set the background color of the game
            game.stage.backgroundColor = "#FFC300";

            // Set the physics system
            game.physics.startSystem(Phaser.Physics.ARCADE);

            // Display the bird at the position x=100 and y=245
            this.bird = game.add.sprite(100, 245, "bird");

            // Add physics to the bird
            // Needed for: movements, gravity, collisions, etc.
            game.physics.arcade.enable(this.bird);

            // Add gravity to the bird to make it fall
            this.bird.body.gravity.y = 1000;

            // Call the 'jump' function when the spacebar is hit
            var spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
            spaceKey.onDown.add(this.jump, this);

            // Display the score in the top left
            this.score = 0;
            this.labelScore = game.add.text(20, 20, "0", {
              font: "30px Arial",
              fill: "#ffffff",
            });

            // Display the high score below the current score
            // Requires retrieving the high score saved for the current session
            this.highScore = 0;
            if (sessionStorage.getItem("flappyBirdHighScore") !== null) {
                this.highScore = parseInt(sessionStorage.getItem("flappyBirdHighScore"));
            }
            this.labelHighScore = game.add.text(20, 55, "HIGH SCORE: " + this.highScore, {
                font: "20px Arial",
                fill: "#ffffff",
            });

            // Move the anchor of the bird to the left and downward
            this.bird.anchor.setTo(-0.2, 0.5);
        },

        addOnePipe: function (x, y) {
            // Create a pipe at the position x and y
            var pipe = game.add.sprite(x, y, "pipe");

            // Add the pipe to our previously created group
            this.pipes.add(pipe);

            // Enable physics on the pipe
            game.physics.arcade.enable(pipe);

            // Add velocity to the pipe to make it move left
            pipe.body.velocity.x = -200;

            // Automatically kill the pipe when it's no longer visible
            pipe.checkWorldBounds = true;
            pipe.outOfBoundsKill = true;
        },

        addRowOfPipes: function () {
            // Randomly pick a number between 1 and 5
            // This will be the hole position
            var hole = Math.floor(Math.random() * 5) + 1;

            // Add the 6 pipes
            // With one big hole at position 'hole' and 'hole + 1'
            for (var i = 0; i < 8; i++)
              if (i != hole && i != hole + 1) this.addOnePipe(400, i * 60 + 10);

            // Increment the score each time new pipes are created
            this.score += 1;
            this.labelScore.text = this.score;

            // Save the high score in session storage
            if (this.score > sessionStorage.getItem("flappyBirdHighScore")) {
                sessionStorage.setItem("flappyBirdHighScore", this.score);
                // Display the current high score
                this.labelHighScore.text = "HIGH SCORE: " + this.score;
            }
        },

        update: function () {
            // This function is called 60 times per second
            // It contains the game's logic

            // Rotate the bird downwards
            if (this.bird.angle < 20) this.bird.angle += 1;

            // If the bird is out of the screen (too high or too low)
            // Call the 'restartGame' function
            if (this.bird.y < 0 || this.bird.y > 490) {
                this.restartGame();
            }

            // Restart the game each time the bird collides with a pipe
            game.physics.arcade.overlap(
                this.bird, this.pipes, this.restartGame, null, this);
            },

            // Make the bird jump
            jump: function () {
            // Add a vertical velocity to the bird
            this.bird.body.velocity.y = -350;

            // Create an animation on the bird
            var animation = game.add.tween(this.bird);

            // Change the angle of the bird to -20° in 100 milliseconds
            animation.to({ angle: -20 }, 100);

            // And start the animation
            animation.start();

            // Play jump sound effect
            this.jumpSound.play(); 

            // Prevent bird from jumping after dying
            if (this.bird.alive == false)
                return;  
        },

        // Restart the game
        restartGame: function () {
            // Start the 'main' state, which restarts the game
            game.state.start("main");

            // Reset the score
            game.physics.arcade.overlap(
                this.bird,
                this.pipes,
                this.hitPipe,
                null,
                this
            );
        },

        hitPipe: function () {
            // If the bird has already hit a pipe, do nothing
            // It means the bird is already falling off the screen
            if (this.bird.alive == false) return;

            // Set the alive property of the bird to false
            this.bird.alive = false;

            // Play gameover sound effect
            this.gameOverSound.play();

            // Prevent new pipes from appearing
            game.time.events.remove(this.timer);

            // Go through all the pipes, and stop their movement
            this.pipes.forEach(function (p) {
                p.body.velocity.x = 0;
            }, this);
        }
    };
};

// Initialize Phaser, and create a 400px by 490px game
var game = new Phaser.Game(400, 490);


// Manually start the game
function startGame(event) {
    //check if game has been created
    if (game.state._created) {
        return;
    }
    game.state.add("main", mainState(birdpreview.src, pipepreview.src));
    game.state.start("main");
}