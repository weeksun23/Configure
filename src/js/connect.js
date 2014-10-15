define(function(){
	"use strict";
	//储存所有连接关系
	var Connection = {
		/**
		 * id:number element id
		 * val:object {
		 * 	id:number element id
		 * 	position : 连接位置
		 * }
		 */
		set : function(){
			for(var i=0,ii=arguments.length;i<ii;i = i + 2){
				var item = this[arguments[i]];
				if(!item){
					item = this[arguments[i]] = [];
				}
				item.push(arguments[i + 1]);
			}
		},
		/**
		 * 移除连接关系
		 */
		remove : function(id){
			var removeCon = this[id];
			if(removeCon){
				for(var i=0,ii=removeCon.length;i<ii;i++){
					var targetCon = this[removeCon[i].id];
					if(targetCon){
						for(var j=0,jj=targetCon.length;j<jj;j++){
							if(targetCon[j].id === id){
								targetCon.splice(j,1);
								break;
							}
						}
					}
				}
				this[id] = null;
				delete this[id];
			}
		},
		/**
		 * 遍历所有连接到id的连接对象，查看point点是否已被连接，是则返回true否则返回false
		 */
		isExist : function(id,point){
			var conArr = this[id];
			if(!conArr) return false;
			for(var i=0,ii=conArr.length;i<ii;i++){
				var target = conArr[i].position;
				if(target && point.x === target.x && point.y === target.y){
					return true;
				}
			}
			return false;
		}
	};
	//获取两点距离
	function getPointDistance(p1,p2){
		return Math.sqrt(Math.pow(p2.x - p1.x,2) + Math.pow(p2.y - p1.y,2));
	}
	//获取连接点
	function getTargetPoint(arr,compareP){
		var index = 0,
			min;
		for(var i=0,ii=arr.length;i<ii;i++){
			var mid = getPointDistance(compareP,arr[i]);
			if(i === 0){
				min = mid;
				continue;
			}
			if(mid < min){
				min = mid;
				index = i;
			}
		}
		return index;
	}
	/**
	 * 移动连线圆，同时改变其所属image或者path的size或path
	 */
	function moveCirclePos(paper,circle,cx,cy){
		var item = circle.data("belong");
		var target = paper.getById(item.id);
		var position = item.position;
		switch(target.type){
			case "image" : 
				var circles = target.data("circleSet"),
					is0 = position === 0,
					is2 = position === 2,
					is1 = position === 1,
					is3 = position === 3,
					MIN_SIZE = 16,
					bbox = target.getBBox(),
					newW = (is0 || is2) ? bbox.x2 - cx : cx - bbox.x,
					newH = (is0 || is1) ? bbox.y2 - cy : cy - bbox.y;
				if(newW < MIN_SIZE){
					newW = MIN_SIZE;
					cx = (is0 || is2) ? bbox.x2 - MIN_SIZE : bbox.x + MIN_SIZE;
				}
				if(newH < MIN_SIZE){
					newH = MIN_SIZE;
					cy = (is0 || is1) ? bbox.y2 - MIN_SIZE : bbox.y + MIN_SIZE;
				}
				if(is0 || is1){
					circles[is0 ? 1 : 0].attr({cy : cy});
					circles[is0 ? 2 : 3].attr({cx : cx});
				}else{
					circles[is2 ? 0 : 1].attr({cx : cx});
					circles[is2 ? 3 : 2].attr({cy : cy});
				}
				var targetX = (is0 || is2) ? cx : (cx - newW);
				var targetY = (is0 || is1) ? cy : (cy - newH);
				target.attr({
					width : newW,
					height : newH
				});
				moveImgEl(paper,target,targetX,targetY,null,true);
				break;
			case "path": 
				var pathArr = Raphael.parsePathString(target.attr("path"));
				var ii = pathArr.length;
				var index = position === 0 ? 0 : ii - 1;
				for(var i=0;i<ii;i++){
					if(i === index){
						pathArr[i][1] = cx;
						pathArr[i][2] = cy;
					}
				}
				var str = pathArr.toString();
				target.attr("path",str);
				var other = target.data("other");
				if(other){
					other.attr("path",str);
				}
				break;
		}
		circle.attr({
			cx : cx,
			cy : cy
		});
	}
	/**
	 * 移动连线圆，同时移动其连接了的连接器
	 */
	function moveCircle(paper,circleId,x,y){
		var conArr = Connection[circleId];
		if(conArr && conArr.length > 0){
			//如果已经连接了连接器,则带动连接器一起移动
			//连线圆只能同时连接一个连接器
			var connect = conArr[0];
			var connector = paper.getById(connect.id);
			var pos = connect.position;
			var w = connector.attr('width'),
				h = connector.attr('height');
			moveImgEl(paper,connector,x - pos.x * w,y - pos.y * h,circleId);
		}
	}
	//移动连接器以及与其建立了连线关系的连线圆
	function moveImgEl(paper,imgEl,x,y,excludeId,unMoveCircleSet){
		imgEl.attr({
			x : x,
			y : y
		});
		var imgId = imgEl.id;
		var stuff = imgEl.data("leaf") || imgEl.data("fire");
		if(stuff){
			var bbox = imgEl.getBBox();
			stuff.attr({
				x : x + bbox.width * stuff.data('lFactor'),
				y : y + bbox.height * stuff.data('tFactor')
			});
		}
		var conArr = Connection[imgId];
		if(conArr){
			//遍历所有连接点
			bbox = bbox || imgEl.getBBox();
			for(var i=0,ii=conArr.length;i<ii;i++){
				var item = conArr[i],
					id = item.id,
					pos = item.position;
				if(id !== excludeId){
					var el = paper.getById(id);
					var x = bbox.x + bbox.width * pos.x;
					var y = bbox.y + bbox.height * pos.y;
					if(el.type === "circle"){
						//与连线圆相连
						moveCirclePos(paper,el,x,y);
					}else{
						//获取连接点在设备中的position值
						var arr = Connection[id];
						for(var j=0,jj=arr.length;j<jj;j++){
							if(arr[j].id === imgId){
								var innerPos = arr[j].position;
								//计算设备新坐标
								moveImgEl(paper,el,x - el.attr('width') * innerPos.x,
										y - el.attr("height") * innerPos.y,imgId);
								break;
							}
						}
					}
				}
			}
		}
		if(unMoveCircleSet) return;
		var set = imgEl.data("circleSet");
		if(set){
			bbox = imgEl.getBBox();
			set.move([[bbox.x,bbox.y],[bbox.x2,bbox.y],[bbox.x,bbox.y2],[bbox.x2,bbox.y2]]);
		}
	}
	//连接器与设备相连
	function connectorToDevice(paper,connector,device,deviceBbox,x,y,canConnect){
		var deviceCanConnect = getCanConnectPoints(device);
		//设备没有可以连接的点
		if(deviceCanConnect.length === 0) return;
		var points = [];
		var w = deviceBbox.width;
		var h = deviceBbox.height;
		var x1 = deviceBbox.x;
		var y1 = deviceBbox.y;
		//根据比例转换成相应坐标
		for(var i=0,ii=deviceCanConnect.length;i<ii;i++){
			points.push({
				x : x1 + w * deviceCanConnect[i].x,
				y : y1 + h * deviceCanConnect[i].y
			});
		}
		//找到与中心点最近的点的索引
		var index = getTargetPoint(points,{x : x,y : y});
		var target = deviceCanConnect[index];
		for(var i=0,ii=canConnect.length;i<ii;i++){
			var item = canConnect[i];
			if((target.x < 0.5 && item.x === 1) || (target.x > 0.5 && item.x === 0)
					|| (target.y < 0.5 && item.y === 1) || (target.y > 0.5 && item.y === 0)){
				break;
			}
		}
		if(i !== ii){
			//找到连接点item,将item与target相连
			var tx = points[index].x,
				ty = points[index].y;
			moveImgEl(paper,connector,tx - connector.attr("width") * item.x,
					ty - connector.attr("height") * item.y);
			connectEffect(paper,tx,ty);
			//建立连接关系
			Connection.set(connector.id,{
				id : device.id,
				position : item
			},device.id,{
				id : connector.id,
				position : target
			});
		}
	}
	//获取el可以连接的点
	function getCanConnectPoints(el){
		var points = el.data("connectPoints");
		if(!points) return [];
		var canConnect = [];
		for(var i=0,ii=points.length;i<ii;i++){
			if(!Connection.isExist(el.id, points[i])){
				canConnect.push(points[i]);
			}
		}
		return canConnect;
	}
	//连接path和connector
	function pathToConnector(paper,circle,connector,bbox,x,y){
		var points = connector.data("connectPoints");
		if(points){
			var w = bbox.width,
				h = bbox.height,
				arr = [];
			//获取所有可连接的点
			for(var i=0,ii=points.length;i<ii;i++){
				arr.push({
					x : bbox.x + w * points[i].x,
					y : bbox.y + h * points[i].y
				});
			}
			//获取与(X,Y)最近的点的索引
			var index = getTargetPoint(arr,{x : x,y : y});
			//查看该点是否已被连接了
			var point = points[index];
			if(!point || Connection.isExist(connector.id, point)){
				return;
			}
			//连接
			var tx = arr[index].x,
				ty = arr[index].y;
			moveCirclePos(paper,circle,tx,ty);
			connectEffect(paper,tx,ty);
			//建立连接关系
			Connection.set(connector.id,{
				id : circle.id,
				position : point
			},circle.id,{
				id : connector.id,
				position : point
			});
		}
	}
	//连接动画效果
	function connectEffect(paper,x,y){
		var circle = paper.circle(x,y,8);
		circle.attr({
			stroke : "red",
			'stroke-opacity' : 0.7,
			fill : "red",
			'fill-opacity' : 0.7
		}).animate({
			'fill-opacity' : 0.1,
			'stroke-opacity' : 0.1,
			r : 30
		},400,'linear',function(){
			this.remove();
		});
	}
	return function(Configure){
		Configure.connect = {
			remove : function(id){
				Connection.remove(id);
			},
			isConnect : function(id){
				var item = Connection[id];
				return item && item.length > 0 ? true : false;
			},
			getConnectData : function(){
				var data = {};
				for(var i in Connection){
					if("set|remove|isExist".indexOf(i) === -1){
						data[i] = Connection[i];
					}
				}
				return data;
			},
			setConnection : function(con){
				$.extend(Connection,con);
			}
		};
		return {
			moveCirclePos : moveCirclePos,
			moveCircle : moveCircle,
			moveImgEl : moveImgEl,
			connectorToDevice : connectorToDevice,
			getCanConnectPoints : getCanConnectPoints,
			pathToConnector : pathToConnector
		};
	};
});