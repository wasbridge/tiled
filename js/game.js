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

(function() {
	var canvas = document.getElementById('tiles');
	var inputs = new grasslands.InputHandler();

	$(window).resize(function(){
		canvas.width = $('.container').width();
		canvas.height = $('.container').height();
	});

	$(window).trigger("resize");

	var resources = new tiles.Resources({width: 64, height: 64});
	resources.emplaceTileData('grass', 'img/grass.png');
	resources.emplaceEntitySprite('character', 'img/character-8x4x.png', 4, 8)
	resources.emplaceEntityData('rock', 'img/rock.png');

	var mapData = new tiles.MapData('grass');
	mapData.set(100, 100, 'grass');

	var generateSpriteSlice = function(key, row, count) {
		var ret = [];
		for (var i=0; i < count; ++i) {
			ret.push(key + '-' + row + '-' + i);
		}
		return ret;
	};

	var mainCharacterConfig = {
		spriteSets: {
			'left': generateSpriteSlice('character', 1, 8),
			'right': generateSpriteSlice('character', 2, 8),
			'up': generateSpriteSlice('character', 3, 8),
			'down': generateSpriteSlice('character', 0, 8),
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
				character.updateSprite(character.spriteSetKey, false)
			}
		},
		onCollisionDetect: function(character, entity, world) {
			var dx = -character.velocityMagnitude * Math.cos(character.velocityAngle);
			var dy = -character.velocityMagnitude * Math.sin(character.velocityAngle);
			character.location.x += dx;
			character.location.y += dy;
		}, 
		hitArea: function(character, world) {
			var size = character.size(world);
			return {
				x: character.location.x + .2 * size.width,
				y: character.location.y + .75 * size.height,
				width: size.width * .6,
				height: size.height * .15
			}
		}
	};

	var rockConfig = {
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
		},
		postRender: function(ctx, rock, world) {

		}
	};

	var entities = [];
	var mainCharacter = new tiles.Entity(mainCharacterConfig);	

	for (var i=0; i < 1000; ++i) {
		entities.push(new tiles.Entity(rockConfig));
	}

	entities.push(mainCharacter);
	
	var world = new tiles.World(mapData, entities, resources, canvas);
	world.centerOn(mainCharacter);

	resources.load(function() {
		world.start();
	});
}())