var tiles = tiles || {};

tiles.utils = {
	generateUUID: function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    	var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    	return v.toString(16);
		});
	},
	generateSpriteSlice: function(key, row, count, byRow) {
		var ret = [];
		for (var i=0; i < count; ++i) {
			if (byRow)
				ret.push(key + '-' + row + '-' + i);
			else
				ret.push(key + '-' + i + '-' + row);
		}
		return ret;
	},
	intersectRect: function(r1, r2) {
		return !(r2.x > r1.x + r1.width || 
		       r2.x + r2.width < r1.x || 
		       r2.y > r1.y + r1.height ||
		       r2.y + r2.height < r1.y);
	}
};

tiles.Resources = function(tileSize) {
	this.tileSize = tileSize;

	var emplaceImgQueue = [];
	var emplaceSpriteDataQueue = [];

	var loadImmediately = false;
	var loadCount = 0;

	var data = { 
		tileImg: {},
		entityImg: {}
	};

	var emplaceImgData = function(key, type, resource, size, doneCb) {
		if (loadImmediately) {
			var img = new Image;
			img.onload = function() {
				var canvasCache = document.createElement('canvas'), cacheCtx;
				cacheCtx = canvasCache.getContext('2d');
				if (size) {
					canvasCache.setAttribute('width', size.width);
					canvasCache.setAttribute('height', size.height);
				} else {
					canvasCache.setAttribute('width', img.width);
					canvasCache.setAttribute('height', img.height);
				}
	  			cacheCtx.drawImage(img, 0, 0);
				data[type][key] = canvasCache;
				
				loadCount = Math.max(0, loadCount-1);
				if (loadCount == 0 && doneCb)
					doneCb();
			};
			img.src = resource; 
		} else {
			emplaceImgQueue.push([key, type, resource, size]);
		}
	};

	var emplaceSpriteData = function(key, type, resource, rows, cols, size, doneCb) {
		if (loadImmediately) {
			var img = new Image;
			img.onload = function() {
				var sliceWidth = img.width / cols;
				var sliceHeight = img.height / rows;
				
				for (var row=0; row < rows; ++row) {
					for (var col=0; col < cols; ++ col) {
						var canvasCache = document.createElement('canvas')
						var cacheCtx = canvasCache.getContext('2d');
						
						if (size) {
							canvasCache.setAttribute('width', size.width);
							canvasCache.setAttribute('height', size.height);
						} else {
							canvasCache.setAttribute('width', sliceWidth);
							canvasCache.setAttribute('height', sliceHeight);
						}

						cacheCtx.drawImage(img, col*sliceWidth, row*sliceHeight, sliceWidth, sliceHeight,
												0, 0, sliceWidth, sliceHeight);
						data[type][key + '-' + (row) + '-' + (col)] = canvasCache;
					}
				}
	  			
				loadCount = Math.max(0, loadCount-1);
				if (loadCount == 0 && doneCb)
					doneCb();
			};
			img.src = resource; 
		} else {
			emplaceSpriteDataQueue.push([key, type, resource, rows, cols, size]);
		}
	}

	var retrieveData = function(key, type) {
		return data[type][key];
	}

	this.emplaceTileData = function(key, resource) {
		emplaceImgData(key, 'tileImg', resource, this.tileSize);
	};

	this.emplaceEntityData = function(key, resource) {
		emplaceImgData(key, 'entityImg', resource, undefined);
	};

	this.emplaceTileSprite = function(key, resource, rows, cols) {
		emplaceSpriteData(key, 'tileImg', resource, rows, cols, this.tileSize);
	}

	this.emplaceEntitySprite = function(key, resource, rows, cols) {
		emplaceSpriteData(key, 'entityImg', resource, rows, cols, undefined);
	}

	this.tileData = function(key) {
		return retrieveData(key, 'tileImg');
	};

	this.entityData = function(key) {
		return retrieveData(key, 'entityImg'); 
	};

	this.load = function(cb) {
		loadImmediately = true;
		loadCount = emplaceImgQueue.length + emplaceSpriteDataQueue.length;
		
		for (var i=0, len=emplaceImgQueue.length; i < len; ++i) {
			emplaceImgQueue[i].push(cb);
			emplaceImgData.apply(this, emplaceImgQueue[i]);
		}

		for (var i=0, len=emplaceSpriteDataQueue.length; i < len; ++i) {
			emplaceSpriteDataQueue[i].push(cb);
			emplaceSpriteData.apply(this, emplaceSpriteDataQueue[i]);
		}
	}
};

tiles.MapData = function(defaultValue) {
	this.data = [];
	this.defaultValue = defaultValue;

	this.set = function(row, col, value) {
		var rowData = this.data[row] || [];
		rowData[col] = value;
		this.data[row] = rowData;
	};

	this.get = function(row, col) {
		var rowData = this.data[row] || [];
		return rowData[col] || this.defaultValue;
	};

	this.extents = function(tileSize) {
		var cols = 0;
		for (var row=0, len=this.data.length; row < len; ++row) {
			var rowData = this.data[row] || [];
			if (cols < rowData.length)
				cols = rowData.length;
		}

		return {
			rows: this.data.length,
			cols: cols,
			height: (this.data.length) * (tileSize ? tileSize.height : 0),
			width: (cols) * (tileSize ? tileSize.width : 0)
		};
	}
};

tiles.Sprite = function(resources) {
	this.defaultSpeed = 4;
	this.animate = true;
	this.index = 0;
	this.speed = this.defaultSpeed; //the bigger the slower
	this.resources = resources;

	var tickCount = this.speed;

	this.reset = function() {
		this.index = 0;
		this.speed = this.defaultSpeed;
		tickCount = this.speed;
	};

	this.update = function(world) {
		if (!this.animate)
			return;

		tickCount--;
		if(tickCount < 0)
			tickCount = this.speed;

		if (tickCount == 0) {
			this.index++;

			if (this.index >= this.resources.length)
				this.index = 0;
		}
	};

	this.size = function(imgLoader) {
		var data = imgLoader(this.resources[this.index]);
		if (data)
			return { width:data.width, height:data.height }
		else
			throw 'No sprite active'
	};

	this.render = function(ctx, imgLoader, origin) {
		var data = imgLoader(this.resources[this.index]);
		if (data)
			ctx.drawImage(data, 0, 0, data.width, data.height, 
				origin.x, origin.y, data.width, data.height);
		else
			throw 'No sprite active'
	};
}

tiles.Entity = function(config) {
	var cachedSize = {width:0, height:0};

	this.config = config;
	this.detectsCollisions = this.config.detectsCollisions ? true : false;
	this.spriteSetKey = null;
	this.spriteSets = this.config.spriteSets; // {key:[], key2:[]}
	this.sprite;
	this.location;
	this.lastLocation;
	this.velocityAngle = 0;
	this.velocityMagnitude = 0;
	this.id = tiles.utils.generateUUID();

	this.type = function() {
		if (config.type)
			return config.type;
		else
			return "unknown";
	};

	this.init = function(world) {
		extents = world.mapData.extents(world.resources.tileSize);

		this.config.onInit(this, world);
		if (!this.location || !this.sprite)
			throw "location or sprite not initialized";

		this.lastLocation = this.location;
	};

	this.isOnEdge = function(world) {
		var size = this.size(world);
		var rect = {
			x: this.location.x,
			y: this.location.y,
			width: size.width,
			height: size.height
		};

		if (rect.x == 0 ||
			rect.x + rect.width == extents.width ||
			rect.y == 0 ||
			rect.y + rect.height == extents.height) {
			return true;
		}

		return false;
	};

	this.setSprite = function(key, index, animate) {
		this.spriteSetKey = key;
		this.sprite = new tiles.Sprite(this.spriteSets[key])
		this.sprite.index = index || 0;
		this.sprite.animate = animate || false;
	};

	this.updateSprite = function(key, animate) {
		if (key != this.spriteSetKey) {
			this.spriteSetKey = key;
			this.sprite = new tiles.Sprite(this.spriteSets[key])
			this.sprite.animate = animate || false;
		}

		if (animate != this.sprite.animate) {
			this.sprite.animate = animate;
			this.sprite.reset();
		}		
	};

	this.changeSpriteSpeed = function(value) {
		this.sprite.speed = Math.max(1, this.sprite.defaultSpeed / value);
	};

	this.move = function(dx, dy) {
		this.location.x += dx;
		this.location.y += dy;

		this.velocityMagnitude += Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
		this.velocityAngle += Math.atan2(dy,dx);

		this.location.x = Math.min(extents.width - cachedSize.width, Math.max(0, this.location.x));
		this.location.y = Math.min(extents.height - cachedSize.height, Math.max(0, this.location.y));
	};

	this.update = function(world) {
		this.velocityMagnitude = 0;
		this.velocityAngle = 0;

		if (this.config.onUpdate)
			this.config.onUpdate(this, world);
		this.sprite.update(world);
	};

	this.detectCollision = function(otherEnt, world, previousCollisions) {
		var thisEntHitArea = this.hitArea(world);
		var otherEntHitArea = otherEnt.hitArea(world);
		var toReturn = false;
		var clearCount = 0;

		previousCollisions = previousCollisions || [];

		if (tiles.utils.intersectRect(thisEntHitArea, otherEntHitArea)) {	
			this.config.onCollisionDetect(this, otherEnt, world, previousCollisions);
			toReturn = true;
		}

		//make sure we inform the other entity of the collision
		if (toReturn && otherEnt.detectsCollisions) {
			otherEnt.config.onCollisionDetect(otherEnt, this, world, previousCollisions);
		}

		//make sure we clear the collision
		if (toReturn) {
			previousCollisions.push(otherEnt);
			while (this.detectCollision(otherEnt, world, previousCollisions) && clearCount < 10) {
				clearCount++;
			}
		}
		
		return toReturn;
	},

	this.updateCollisions = function(world) {
		//todo check if tile is valid
		//for now we just check if we collide with other entities
		var exclusions = [];
		var previousCollisions = [];
		var collision;
		var retest;
		var count = 0;
		do
		{
			count++;
			retest = false;

			for (var i=0,len=world.entities.length; i < len; ++i) {
				otherEnt = world.entities[i];
				if (this != otherEnt) {
					if (exclusions.indexOf(otherEnt.id) < 0) {
						collision = this.detectCollision(otherEnt, world, previousCollisions);
						if (collision) {
							exclusions.push(otherEnt.id);
							previousCollisions.push(otherEnt);
							retest = true;
							break;
						}
					}
				}
			}
		} while (retest && count <= 10);
	};

	this.hitArea = function(world) {
		if (this.config.hitArea)
			return this.config.hitArea(this, world);

		var size = this.size(world);
		var rect = {
			x: this.location.x,
			y: this.location.y,
			width: size.width,
			height: size.height
		}
		return rect;
	};

	this.size = function(world) {
		cachedSize = this.sprite.size(world.resources.entityData);
		return cachedSize;
	};

	this.render = function(ctx, world) {
		this.sprite.render(ctx, world.resources.entityData, this.location);
		if (this.config.postRender)
			this.config.postRender(ctx, this, world);
		this.lastLocation = this.location;
	};
}

tiles.Tile = function(own, rez) {
	var resource = rez instanceof Array ? rez : [rez];
	var owner = own;
	var sprite = new tiles.Sprite(resource);

	this.update = function(world) {
		sprite.update(world);
	};

	this.render = function(ctx, world, origin) {
		sprite.render(ctx, world.resources.tileData, origin);
	};
};

tiles.World = function(mapData, entities, resources, canvas) {
	this.mapData = mapData;
	this.resources = resources;

	this.entities = entities;	
	this.tiles = null;
	this.startTime = undefined;
	this.duration = 0;

	var centerEntity = null;
	var id = null;
	
	var canvas = canvas;
	var ctx = canvas.getContext('2d');

	var backBuffer = document.createElement('canvas');
	var backBufferCtx = backBuffer.getContext('2d');

	var tileSize = this.resources.tileSize;
	var extents = this.mapData.extents(tileSize);
	
	this.tiles = new Array(extents.rows);
	
	for (var row=0; row < extents.rows; ++row) {
		var rowData = new Array(extents.cols);
		for (var col=0; col < extents.cols; ++col) {
			rowData[col] = new tiles.Tile(this, this.mapData.get(row, col));
		}
		this.tiles[row] = rowData;
	}

	for (var i=0,len=this.entities.length; i < len; ++i) {
		this.entities[i].init(this);
	}
	
	this.centerOn = function(entity) {
		centerEntity = entity;
	};

	this.start = function() {
		this.startTime = this.startTime || new Date().getTime();
		id = requestAnimationFrame(this.run.bind(this));
	};

	this.run = function() {
		this.duration = (new Date().getTime()) - this.startTime;
		id = requestAnimationFrame(this.run.bind(this));
		this.update();
		this.render();
	};

	this.stop = function() {
		cancelAnimationFrame(id);
	};

	this.update = function() {
		//update tiles
		for (var row=0,rows=this.tiles.length; row < rows; ++row) {
			var rowData = this.tiles[row];
			for (var col=0,cols=rowData.length; col < cols; ++col) {
				rowData[col].update(this);
			}
		}

		//update entities
		for (var i=0,len=this.entities.length; i < len; ++i) {
			this.entities[i].update(this);
		}

		//update collisions
		for (var i=0,len=this.entities.length; i < len; ++i) {
			if (this.entities[i].detectsCollisions) {
				this.entities[i].updateCollisions(this);
			}
		}
	};

	this.render = function() {
		var rowStart = 0;
		var colStart = 0;

		var left = 0;
		var top = 0;

		var rowsPerScreen = Math.ceil(canvas.height / tileSize.height);
		var colsPerScreen = Math.ceil(canvas.width / tileSize.width);

		if (centerEntity) {
			var size = centerEntity.size(this);
			var centerPosX = centerEntity.location.x + size.width / 2;
			var centerPosY = centerEntity.location.y + size.height / 2;

			left = centerPosX - canvas.width/2;
			top = centerPosY - canvas.height/2;

			left = Math.max(0, Math.min(left, extents.width - canvas.width));
			top = Math.max(0, Math.min(top, extents.height - canvas.height));

			colStart = Math.floor(left / tileSize.width);
			rowStart = Math.floor(top / tileSize.height);

			rowStart = Math.max(0, Math.min(rowStart, extents.rows - rowsPerScreen - 1));
			colStart = Math.max(0, Math.min(colStart, extents.cols - colsPerScreen - 1));
		}

		var rowEnd = Math.max(0, Math.min(rowStart + rowsPerScreen, extents.rows - 1));
		var colEnd = Math.max(0, Math.min(colStart + colsPerScreen, extents.cols - 1));

		ctx.drawImage(backBuffer, 0, 0, backBuffer.width, backBuffer.height);
		
		backBuffer.setAttribute('width', canvas.width);
		backBuffer.setAttribute('height', canvas.height);

		backBufferCtx.beginPath();
		backBufferCtx.rect(0, 0, extents.width, extents.height);
		backBufferCtx.clip();
		backBufferCtx.translate(-left, -top);

		for (var row=rowStart; row <= rowEnd; ++row) {
			var rowData = this.tiles[row];
			for (var col=colStart; col <= colEnd; ++col) {
				rowData[col].render(backBufferCtx, 
					this, {x:col * tileSize.width, y:row * tileSize.height});
			}
		}

		for (var i=0,len=this.entities.length; i < len; ++i) {
			this.entities[i].render(backBufferCtx, this);
		}
	};
};