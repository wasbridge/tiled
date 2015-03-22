var grasslands = grasslands || {};

grasslands.InputHandler = function() {
	this.keyboard = {keys: []},
	this.mouse = {position: undefined, down:false};

	$(window).keydown(function(e) {
		var keys = this.keyboard.keys;
		if (keys.indexOf(e.keyCode) < 0)
			this.keyboard.keys.push(e.keyCode);
	}.bind(this));

	$(window).keyup(function(e){
		var keys = this.keyboard.keys;
		var index = keys.indexOf(e.keyCode);
		if (index >= 0) {
			keys.splice(index, 1);
			this.keyboard.keys = keys;
		}	
	}.bind(this));

	$(window).mousedown(function(e){
		this.mouse.down = true;
		this.mouse.position = {x:e.clientX, y:e.clientY};
	}.bind(this));

	$(window).mousemove(function(e){
		this.mouse.position = {x:e.clientX, y:e.clientY};
	}.bind(this));

	$(window).mouseup(function(e){
		this.mouse.down = false;
		this.mouse.position = {x:e.clientX, y:e.clientY};
	}.bind(this));
};

grasslands.generateCarConfig = function(number, mainCharacter) {
	return {
		spriteSets: {
			'left': tiles.utils.generateSpriteSlice('car', 1, 4),
			'right': tiles.utils.generateSpriteSlice('car', 2, 4),
			'up': tiles.utils.generateSpriteSlice('car', 3, 4),
			'down': tiles.utils.generateSpriteSlice('car', 0, 4),
		},
		number: number,
		mainCharacter: mainCharacter,
		detectsCollisions: true,
		onCollisionDetect: function(character, entity, world) {
			var dx = -character.velocityMagnitude * Math.cos(character.velocityAngle);
			var dy = -character.velocityMagnitude * Math.sin(character.velocityAngle);
			character.location.x += dx;
			character.location.y += dy;

			character.updateSprite(character.spriteSetKey =='right' ? 'left' : 'right', true);
		},
		onInit: function(character, world) {
			var initDirection = Math.random() > .5 ? 'right' : 'left';
			character.location = {
				x:80 + (Math.random() * (extents.width - 80)), 
				y:world.resources.tileSize.height * (number + 0.5)
			};
			character.setSprite(initDirection, 0, true);
			character.changeSpeed(Math.random() * 10 + 1);
			character.type == 'car';
		},
		onUpdate: function(character, world) {
			if (character.isOnEdge(world))
				character.updateSprite(character.spriteSetKey =='right' ? 'left' : 'right', true);

			if (character.spriteSetKey =='right')
				character.move(1,0);
			else if (character.spriteSetKey == 'left')
				character.move(-1,0);

		},
		hitArea: function(character, world) {
			var size = character.size(world);
			var leftRight = character.spriteSetKey == 'left' || character.spriteSetKey == 'right';
			
			var widthFactor = leftRight ? .9 : .5;
			var heightFactor = leftRight ? .5 : .9;

			return {
				x: character.location.x + ((1-widthFactor) / 2) * size.width,
				y: character.location.y + ((1-heightFactor) / 2) * size.height,
				width: size.width * widthFactor,
				height: size.height * heightFactor
			}
		}
	};
};

grasslands.generateRockConfig = function(number) {
	return {
		spriteSets: {
			'default': ['rock']
		},
		onInit: function(rock, world) {
			var extents = world.mapData.extents(world.resources.tileSize);
			rock.location = { 
				x:80 + (Math.random() * (extents.width - 80)), 
				y:80 + (Math.random() * (extents.height - 80))
			};
			rock.setSprite('default');
			rock.speed = 0;
			rock.type == 'rock';
		},
		postRender: function(ctx, rock, world) {

		}
	};	
};

(function() {
	var canvas = document.getElementById('tiles');
	var inputs = new grasslands.InputHandler();

	$(window).resize(function(){
		canvas.width = $('.container').width();
		canvas.height = $('.container').height();
	});

	$(window).trigger("resize");

	var resources = new tiles.Resources({width: 250, height: 250});
	resources.emplaceTileData('road', 'img/road.png');
	resources.emplaceEntitySprite('character', 'img/character-8x4x.png', 4, 8);
	resources.emplaceEntitySprite('car', 'img/car-4x4x.png', 4, 4);
	resources.emplaceEntityData('rock', 'img/rock.png');

	var mapData = new tiles.MapData('road');
	mapData.set(30, 30, 'road');

	var mainCharacterConfig = {
		spriteSets: {
			'left': tiles.utils.generateSpriteSlice('character', 1, 8),
			'right': tiles.utils.generateSpriteSlice('character', 2, 8),
			'up': tiles.utils.generateSpriteSlice('character', 3, 8),
			'down': tiles.utils.generateSpriteSlice('character', 0, 8),
		},
		detectsCollisions: true,
		detectsPixelCollisions: false, //false b/c our sprite varies too much
		onInit: function(character, world) {
			character.location = {x: 0, y: 0};
			character.setSprite('down', 0, false);
		},
		onUpdate: function(character, world) {
			var keys = inputs.keyboard.keys;
			if (keys.indexOf(16) >= 0) {
				character.changeSpeed(5);
			} else {
				character.changeSpeed(2);
			}

			if (keys.indexOf(37) >= 0) {
				character.move(-1,0);
				character.updateSprite('left', true);
			} else if (keys.indexOf(39) >= 0) {
				character.move(1,0);
				character.updateSprite('right', true);
			} else if (keys.indexOf(38) >=0) {
				character.move(0, -1);
				character.updateSprite('up', true);
			} else if (keys.indexOf(40) >= 0) {
				character.move(0, 1);
				character.updateSprite('down', true);
			} else {
				character.updateSprite(character.spriteSetKey, false);
			}
		},
		onCollisionDetect: function(character, entity, world) {
			if (entity.type == 'car')
				return;
			
			var dx = -character.velocityMagnitude * Math.cos(character.velocityAngle);
			var dy = -character.velocityMagnitude * Math.sin(character.velocityAngle);
			character.location.x += dx;
			character.location.y += dy;
		}, 
		hitArea: function(character, world) {
			var size = character.size(world);
			return {
				x: character.location.x + .22 * size.width,
				y: character.location.y + .75 * size.height,
				width: size.width * .56,
				height: size.height * .15
			}
		}
	};

	var entities = [];
	var mainCharacter = new tiles.Entity(mainCharacterConfig);	
	var extents = mapData.extents();
	var numRocks = extents.rows * extents.cols * .1;

	for (var i=0; i < extents.rows; ++i) {
		entities.push(new tiles.Entity(grasslands.generateCarConfig(i, mainCharacter)));
	}
	for (var i=0; i < numRocks; ++i) {
		entities.push(new tiles.Entity(grasslands.generateRockConfig(i)));
	}

	entities.push(mainCharacter);
	
	var world = new tiles.World(mapData, entities, resources, canvas);
	world.centerOn(mainCharacter);

	resources.load(function() {
		world.start();
	});
}())