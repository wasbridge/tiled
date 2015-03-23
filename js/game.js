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

grasslands.generateCarConfig = function(number) {
	return {
		spriteSets: {
			'left': tiles.utils.generateSpriteSlice('car', 1, 4, true),
			'right': tiles.utils.generateSpriteSlice('car', 2, 4, true),
			'up': tiles.utils.generateSpriteSlice('car', 3, 4, true),
			'down': tiles.utils.generateSpriteSlice('car', 0, 4, true),
		},
		type: 'car',
		number: number,
		detectsCollisions: true,
		speed: Math.random() * 17 + 3,
		onInit: function(character, world) {
			var extents = world.mapData.extents(world.resources.tileSize);
			var initDirection = Math.random() > .5 ? 'right' : 'left';
			character.setSprite(initDirection, 0, true);
			character.changeSpriteSpeed(this.speed);
			character.location = {
				x:Math.random() * extents.width, 
				y:world.resources.tileSize.height * (number + 0.5)
			};
			
		},
		onCollisionDetect: function(car, entity, world, prevCollisions) {
			if (entity.type() == 'rock') {
				var dx = 0; 
				dx = -car.velocityMagnitude * Math.cos(car.velocityAngle);
				car.updateSprite(car.spriteSetKey =='right' ? 'left' : 'right', true);
				car.move(dx, 0);
				car.clearCollision(entity, world, prevCollisions);
			} 
		},
		onUpdate: function(character, world) {
			if (character.isOnEdge(world))
				character.updateSprite(character.spriteSetKey =='right' ? 'left' : 'right', true);

			if (character.spriteSetKey =='right')
				character.move(1 * this.speed, 0);
			else if (character.spriteSetKey == 'left')
				character.move(-1 * this.speed, 0);

		},
		hitArea: function(character, world) {
			var size = character.size(world);
			var leftRight = character.spriteSetKey == 'left' || character.spriteSetKey == 'right';
			
			var widthFactor = leftRight ? .9 : .5;
			var heightFactor = leftRight ? .5 : .9;
			var rect = {
				x: ((1-widthFactor) / 2) * size.width,
				y: ((1-heightFactor) / 2) * size.height,
				width: size.width * widthFactor,
				height: size.height * heightFactor
			}

			return tiles.utils.rectToPolygon(rect)
		}
	};
};

grasslands.generateRockConfig = function(number) {
	return {
		spriteSets: {
			'default': ['rock']
		},
		type: 'rock',
		onInit: function(rock, world) {
			var extents = world.mapData.extents(world.resources.tileSize);
			rock.location = { 
				x:1000, 
				y:world.resources.tileSize.height * (number + 0.5)
			};
			rock.setSprite('default');
		},
		/*
		postRender: function(ctx, character, world) {
			character.renderHitArea(ctx, world);
		},*/
		hitArea: function(character, world) {
			var poly = [];
			poly.push({x:32, y:1});
			poly.push({x:7, y:14});
			poly.push({x:0, y:36});
			poly.push({x:17, y:62});
			poly.push({x:44, y:62});
			poly.push({x:62, y:46});
			poly.push({x:63, y:25});
			poly.push({x:55, y:13});
			return poly;
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
	resources.emplaceEntitySprite('character', 'img/character-9x4x.png', 4, 9);
	resources.emplaceEntitySprite('car', 'img/car-4x4x.png', 4, 4);
	resources.emplaceEntityData('rock', 'img/rock.png');

	var mapData = new tiles.MapData('road');
	mapData.set(10, 10, 'road');

	var extents = mapData.extents(resources.tileSize);

	var mainCharacterConfig = {
		spriteSets: {
			'left': tiles.utils.generateSpriteSlice('character', 1, 9, true),
			'right': tiles.utils.generateSpriteSlice('character', 3, 9, true),
			'up': tiles.utils.generateSpriteSlice('character', 0, 9, true),
			'down': tiles.utils.generateSpriteSlice('character', 2, 9, true),
		},
		type: 'character',
		detectsCollisions: true,
		speed: 2,
		mapExtents: extents,
		onInit: function(character, world) {
			character.location = {x: 100, y: 100};
			character.setSprite('down', 0, false);
		},
		onUpdate: function(character, world) {
			var keys = inputs.keyboard.keys;
			if (keys.indexOf(16) >= 0) {
				this.speed = 5;
				character.changeSpriteSpeed(5);
			} else {
				this.speed = 2;
				character.changeSpriteSpeed(2);
			}

			var arrows = keys.filter(function(key) {
				return key >= 37 && key <=40;
			});

			var arrow = arrows.pop() || 0;
			if (arrow == 37) {
				character.move(-1 * this.speed, 0);
				character.updateSprite('left', true);
			} else if (arrow == 39) {
				character.move(1 * this.speed,0);
				character.updateSprite('right', true);
			} else if (arrow == 38) {
				character.move(0, -1 * this.speed);
				character.updateSprite('up', true);
			} else if (arrow == 40) {
				character.move(0, 1 * this.speed);
				character.updateSprite('down', true);
			} else {
				character.updateSprite(character.spriteSetKey, false);
			}
		},
		onCollisionDetect: function(character, entity, world, prevCollisions) {
			var dx = 0;
			var dy = 0;
			
			if (entity.type() == 'rock') {
				if (prevCollisions.length == 0) {
					dx = -character.velocityMagnitude * Math.cos(character.velocityAngle);
					dy = -character.velocityMagnitude * Math.sin(character.velocityAngle);
				} else {
					dx = 0;
					dy = -character.velocityMagnitude * Math.cos(character.velocityAngle);
				}
			} else if (entity.type() == 'car') {
				var characterMomentumX = character.velocityMagnitude * Math.cos(character.velocityAngle);
				var carMomentumX = entity.velocityMagnitude * Math.cos(entity.velocityAngle);
				var characterSize = character.size(world);

				dx = carMomentumX - characterMomentumX;

				if (character.location.x + dx < 0 ||
					character.location.x + characterSize.width >= this.mapExtents.width ||
					prevCollisions.length > 0) {
					dy = dx;
					dx = 0;
				}
			}

			character.move(dx, dy);
			character.clearCollision(entity, world, prevCollisions);
		},
		/*postRender: function(ctx, character, world) {
			character.renderHitArea(ctx, world);
		},*/
		hitArea: function(character, world) {
			var poly = [];
			poly.push({x:20, y:50});
			poly.push({x:20, y:64});
			poly.push({x:45, y:64});
			poly.push({x:45, y:50});
			return poly;
		}
	};

	var entities = [];
	var mainCharacter = new tiles.Entity(mainCharacterConfig);	
	var numRocks = extents.rows * extents.cols * .1;

	for (var i=0; i < extents.rows; ++i) {
		entities.push(new tiles.Entity(grasslands.generateRockConfig(i)));
	}

	for (var i=0; i < extents.rows; ++i) {
		entities.push(new tiles.Entity(grasslands.generateCarConfig(i)));
	}
	
	entities.push(mainCharacter);
	
	var world = new tiles.World(mapData, entities, resources, canvas);
	world.centerOn(mainCharacter);
	world.onTick(function() {
		
	});

	resources.load(function() {
		world.start();
	});
}())