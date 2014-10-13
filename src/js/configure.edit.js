define(function(require,exports,module){
	"use strict";
	var Configure = require("configure");
	var Connect = require("common/configure/connect")(Configure);
	require("common/configure/oper")(Configure);
	var eve = Configure.eve;
	//编辑模式
	Configure.edit = true;
	//判断组件是否被选中
	function isSelected(el){
		var set = el.data("circleSet");
		if(!set) return false;
		var re = true;
		//查看第一个元素是否隐藏
		set.forEach(function(el){
			re = el.node.style.display !== 'none';
			return false;
		});
		if(re){
			return set;
		}
		return re;
	}
	function edage(x,y,bbox){
		var constants = Configure.constants;
		var maxX = constants.paperW;
		var maxY = constants.paperH;
		//不能滑出边缘
		if(x < 0){
			x = 0;
		}else if(x + bbox.width > maxX){
			x = maxX - bbox.width;
		}
		if(y < 0){
			y = 0;
		}else if(y + bbox.height > maxY){
			y = maxY - bbox.height;
		}
		return {
			x : x,
			y : y
		};
	}
	//TODO 扩展事件模块
	$.extend(eve,{
		onPathDrag : function(paper,path){
			//路径平移
			return path.drag(function(dx,dy){
				var arr = Raphael.parsePathString(this.sPath);
				var posArr = [];
				for(var i=0,ii=arr.length;i<ii;i++){
					var item = arr[i];
					item[1] += dx;
					item[2] += dy;
					if(i === 0 || i === ii - 1){
						posArr.push([item[1],item[2]]);
					}
				}
				var str = arr.toString();
				this.attr("path",str).noSel = true;
				var target = this;
				var other = this.data("other");
				if(other){
					//平移带虚线的管道时 必须同时 移动另一条路径
					other.attr("path",str);
					if(this.data("type") === 'dottedPipe'){
						//如果平移的是虚线 则要同时移动 管道两端的连线圆
						target = other;
					}
				}
				var set = target.data("circleSet");
				if(set){
					set.move(posArr,function(circle,x,y){
						Connect.moveCircle(paper,circle.id,x,y);
					});
				}
			},function(){
				this.sPath = this.attr("path");
				this.noSel = false;
			},function(){
				this.sPath = null;
				var me = this;
				setTimeout(function(){
					//让选中元素的事件方法先触发
					me.noSel = false;
				});
			});
		},
		onImgDrag : function(img,paper){
			return img.drag(function(dx,dy){
				var type = this.data("type"),
					x = this.sX + dx,
					y = this.sY + dy;
				var bbox = this.getBBox();
				//不能滑出边缘
				var obj = edage(x,y,bbox);
				x = obj.x;
				y = obj.y;
				if(type === 'device' || type === 'heatdevice' || type === 'connector'){
					Connect.moveImgEl(paper,this,x,y);
				}
				this.noSel = true;
			},function(){
				this.sX = this.attr("x");
				this.sY = this.attr("y");
				this.noSel = false;
			},function(){
				this.sX = null;
				this.sY = null;
				var me = this;
				setTimeout(function(){
					//setTimeout让选中元素的事件方法先触发
					me.noSel = false;
				});
				var type = this.data("type");
				if(type === "connector"){
					//drop下连接器
					//先查看还有连接点可以连接否
					var points = this.data("connectPoints");
					var canConnect = Connect.getCanConnectPoints(this);
					if(canConnect.length === 0){
						return;
					}
					var me = this;
					//取connector中点
					var x = me.attr("x") + me.attr("width") / 2;
					var y = me.attr("y") + me.attr("height") / 2;
					//是否 drop在设备上
					paper.forEach(function(el){
						if(el.type === 'image'){
							var type = el.data("type");
							if(type === "device" || type === "heatdevice"){
								var bbox = el.getBBox();
								if(Raphael.isPointInsideBBox(bbox, x, y)){
									//开始连接
									Connect.connectorToDevice(this,me,el,bbox,x,y,canConnect);
									return false;
								}
							}
						}
					},paper);
				}
			});
		},
		onCircleDrag : function(circle,paper){
			return circle.drag(function(dx,dy){
				var x = this.sX + dx,
					y = this.sY + dy;
				Connect.moveCirclePos(paper,this,x,y);
				Connect.moveCircle(paper,this.id,x,y);
			},function(){
				this.sX = this.toFront().attr("cx");
				this.sY = this.attr("cy");
			},function(e){
				this.sX = null;
				this.sY = null;
				//如果drop下的是路径两端的连线圆
				if(this.data("type") === 'pathCircle'){
					if(!this.data("connect")){
						var x = this.attr("cx");
						var y = this.attr("cy");
						var me = this;
						paper.forEach(function(el){
							var type = el.data("type");
							if(type === "connector" || type === 'device' || type === 'heatdevice'){
								var bbox = el.getBBox();
								if(Raphael.isPointInsideBBox(bbox,x,y)){
									Connect.pathToConnector(this,me,el,bbox,x,y);
									return false;
								}
							}
						},paper);
					}
				}
			});
		},
		//为带虚线的管道绑定各种事件
		attachDottedPipe : function(pipe,dotted,paper){
			eve.onMouseDown(pipe,function(){
				eve.onPathClick(this,paper);
			},Configure.menu.pathMenu);
			eve.onMouseDown(dotted,function(){
				eve.onPathClick(pipe,paper);
			},Configure.menu.pathMenu);
			eve.onPathDrag(paper,pipe);
			eve.onPathDrag(paper,dotted);
		},
		//为精简panel绑定各种事件
		attachPanel : function(set){
			set.forEach(function(el){
				el.drag(function(dx,dy){
					this.data("panelSet").forEach(function(el){
						el.attr({
							x : el.sX + dx,
							y : el.sY + dy
						});
					});
				},function(){
					this.data("panelSet").forEach(function(el){
						el.sX = el.attr("x");
						el.sY = el.attr("y");
					});
				},function(){
					this.data("panelSet").forEach(function(el){
						el.sX = null
						el.sY = null
					});
				});
				eve.onMouseDown(el,null,Configure.menu.panelMenu);
			});
		}
	});
	//img点击事件
	(function(eve){
		//存放所有选择的img元素
		var clickEl = [];
		//清空所有或特定选择的元素
		function clearChoose(target){
			for(var i=0,ii=clickEl.length;i<ii;i++){
				var el = clickEl[i];
				if(target){
					if(el.id === target.id){
						el.data("circleSet").method("hide");
						clickEl.splice(i,1);
						return;
					}
				}else{
					var circle = el.data("circleSet");
					circle && circle.hide();
				}
			}
			clickEl.length = 0;
		}
		eve.onImgClick = function(img,paper){
			if(img.noSel) return;
			//选择或取消选择el
			//目前只支持单选
			var re = isSelected(img);
			if(re){
				re.method("hide");
			}else{
				clearChoose();
				var set = img.data("circleSet");
				if(!set){
					var bbox = img.getBBox();
					var newSet = paper.set();
					var id = img.id;
					newSet.push(
						paper.addCircle(bbox.x,bbox.y,id,0,"imgCircle"),
						paper.addCircle(bbox.x2,bbox.y,id,1,"imgCircle"),
						paper.addCircle(bbox.x,bbox.y2,id,2,"imgCircle"),
						paper.addCircle(bbox.x2,bbox.y2,id,3,"imgCircle")
					);
					img.data("circleSet",newSet);
				}else{
					set.method("show");
				}
				//加入选中数组
				clickEl.push(img);
			}
			return img;
		};
		eve.onImgClick.removeChoose = clearChoose;
	})(eve);
	//路径点击事件
	(function(eve){
		var curPath;
		eve.onPathClick = function(path,paper){
			if(path.noSel) return;
			var re = isSelected(path);
			if(re){
				re.method("hide");
				curPath = null;
			}else{
				//取消选中当前的path
				curPath && curPath.data("circleSet").method("hide");
				var set = path.data("circleSet");
				if(!set){
					var sp = path.getPointAtLength(0),
						ep = path.getPointAtLength(path.getTotalLength());
					var newSet = paper.set();
					var id = path.id;
					newSet.push(
						paper.addCircle(sp.x,sp.y,id,0,"pathCircle","#d2d2d2"),
						paper.addCircle(ep.x,ep.y,id,1,"pathCircle","#d2d2d2")
					);
					path.data("circleSet",newSet);
				}else{
					set.method("show");
				}
				curPath = path;
			}
			return path;
		};
		eve.onPathClick.setCurPath = function(re){
			curPath = re;
		};
	})(eve);
	//TODO 扩展模块
	(function(eve){
		function getPoints(str){
			if(!str) return null;
			if(typeof str == 'object') return str;
			var arr = [];
			var points = JSON.parse(str);
			for(var i=0,ii=points.length;i<ii;i++){
				arr.push({
					x : points[i][0],
					y : points[i][1]
				});
			}
			return arr;
		}
		Raphael.st.method = function(method){
			var oArg = arguments;
			this.forEach(function(el){
				el[method].apply(el,Array.prototype.splice.call(oArg,1));
			});
		};
		//设置set中每一个元素的cx cy坐标
		Raphael.st.move = function(posArr,func){
			var i = 0;
			this.forEach(function (el) {
				var item = posArr[i++];
				item && el.attr({
					cx : item[0],
					cy : item[1]
				});
				func && func(el,item[0],item[1]);
		    });
		};
		$.extend(Raphael.fn,{
			/**
			 * data : {
			 * 	circleSet : 连线圆set(device|heatdevice)
			 * 	type : device|heatdevice|connector
			 * 	connectPoints : [{x:1,y:3}]
			 * 	typeVal : plc|conversion|climate|water|elec|heat......
			 * 		plc|conversion|climate|water|elec|heat{
			 * 			attach : {}
			 * 		}
			 * 		计量设备|传感设备:{
			 * 			tipObj : {}
			 * 		}
			 * 		sensor : {
			 * 			attachElId : number 关联的实物 id
			 * 		}
			 * 		waterpump|blowmotor|draftmotor : {
			 * 			attachElId : number 关联的面板 id
			 * 		}
			 * 		blowmotor|draftmotor : {
			 * 			leaf : {} 关联的叶扇对象
			 * 		}
			 * 		boilerinner : {
			 * 			fire : {}
			 * 		}
			 * }
			 */
			addImg : function(src,x,y,w,h,type,points,typeVal){
				var img = this.image(src,x,y,w,h)
					.data("connectPoints",getPoints(points))
					.data("type",type)
					.data("typeVal",typeVal);
				var paper = this;
				eve.onImgDrag(img,this);
				var defaultMenu = Configure.menu.deviceMenu;
				if(typeVal === Configure.constants.blowmotor || typeVal === Configure.constants.draftmotor){
					//风机的话要同时生成叶扇
					Configure.move.addLeaf(img);
				}else if(typeVal === Configure.constants.boilerinner){
					//生成火焰
					Configure.move.addFire(img);
					defaultMenu = Configure.menu.boilerinnerMenu;
				}
				if(type === 'connector'){
					eve.onMouseDown(img,null,Configure.menu.connectorMenu);
				}else{
					eve.onMouseDown(img,function(){
						eve.onImgClick(img,paper);
					},defaultMenu);
				}
				if(typeVal === Configure.constants.plc){
					$("#noplc").hide();
				}
				return img.myBack();
			},
			/**
			 * data : {
			 * 	circleSet : 连线圆set
			 * 	type : pipe 
			 * 	dash : ''
			 * }
			 */
			addPath : function(x,y,dash){
				if(typeof x == 'number'){
					var path = this.path(["M",x," ",y,"L",x + 100," ",y].join("")).attr({
						"stroke" : "#888",
						"stroke-width" : 5,
						"stroke-linecap" : "round"
					});
				}else{
					path = this.path(x).attr(y || {});
				}
				if(dash){
					path.data("dash",dash).attr("stroke-dasharray",dash);
				}
				path.attr("cursor","pointer").myBack()
					.data("type","pipe");
				var paper = this;
				eve.onPathDrag(this,path);
				eve.onMouseDown(path,function(){
					eve.onPathClick(this,paper);
				},Configure.menu.pathMenu);
				return path;
			},
			/**
			 * 增加带虚线的管道
			 * data{
			 * 	circleSet : 连线圆set
			 * 	type : dottedPipe-main | dottedPipe 
			 * }
			 */
			addDottedPipe : function(x,y,z){
				if(typeof x == 'number'){
					var path = ["M",x," ",y,"L",x + 200," ",y].join("");
					//生成虚线
					var dotted = this.path(path).attr({
						"stroke" : z || "blue",
						"stroke-width" : 5,
						"stroke-linecap" : "round",
						"stroke-dasharray" : "-"
					}).myBack();
					//生成管道
					var pipe = this.path(path).attr({
						"stroke" : "#ccc",
						"stroke-width" : 15,
						"stroke-linecap" : "round"
					}).myBack();
					pipe.data("other",dotted).data("type","dottedPipe-main");
					dotted.data("other",pipe).data("type","dottedPipe");
					eve.attachDottedPipe(pipe,dotted,this);
				}else{
					if(z.type === 'dottedPipe'){
						y["stroke-dasharray"] = "-";
					}
					return this.path(x).attr(y).data(z);
				}
			},
			/**
			 * 添加resize圆
			 * data : {
			 * 	belong : 所属img元素信息{
			 * 		id : img id,position : 位置
			 * 	}
			 * 	type : String imgCircle|pathCircle
			 * 	--pathCircle	
			 * }
			 */
			addCircle : function(x,y,id,position,type,bgColor){
				var circle = this.circle(x,y,5);
				var	cursor = "move";
				if(position !== undefined){
					cursor = ["nw-resize","ne-resize","sw-resize","se-resize"][position];
				}else{
					cursor = "nw-resize";
				}
				if(type === "pathCircle"){
					eve.onMouseDown(circle,null,Configure.menu.circlePathMenu);
				}
				eve.onCircleDrag(circle,this);
				return circle.attr({stroke : "green",fill : bgColor || "#66ff33",cursor : cursor})
					.data("belong",{id : id,position : position})
					.data("type",type)
					.toFront();
			}
		});
	})(eve);
	//框选模块
	(function(Configure){
		//初始化标志 保证只执行一次
		var isInit = false;
		Configure.multiple = {
			init : function(paper){
				if(isInit) return;
				function restoreDrawRect(){
					drawRect.hide().attr("cursor","auto").removeData("matchSet");
					hasMove = false;
					isChoosedState = false;
				}
				$("#drawRectMenuCancel").click(restoreDrawRect);
				//生成用于框选的rect
				var drawRect = paper.rect(0,0,0,0,0).hide().drag(function(dx,dy){
					var matchSet = this.data("matchSet");
					matchSet && matchSet.forEach(function(el){
						if(el.type === 'image'){
							Connect.moveImgEl(paper,el,el.sX + dx,el.sY + dy);
						}else{
							var panelSet = el.data("panelSet");
							panelSet.forEach(function(i){
								i.attr({
									x : i.sX + dx,
									y : i.sY + dy
								});
							});
						}
					});
					this.attr({
						x : this.sX + dx,
						y : this.sY + dy
					});
				},function(){
					//记录起始坐标
					var matchSet = this.data("matchSet");
					matchSet && matchSet.forEach(function(el){
						if(el.type === 'image'){
							el.sX = el.attr("x");
							el.sY = el.attr("y");
						}else{
							var panelSet = el.data("panelSet");
							panelSet.forEach(function(i){
								i.sX = i.attr('x');
								i.sY = i.attr('y');
							});
						}
					});
					this.sX = this.attr('x');
					this.sY = this.attr('y');
				}).attr({
					stroke : 'blue',
					fill : "#d2d2d2",
					"fill-opacity" : 0.3,
					"stroke-dasharray" : "- "
				}).data("drawRect",true);
				eve.onMouseDown(drawRect,null,Configure.menu.drawRectMenu);
				//是否框选过的标志
				var hasMove = false;
				//是否处于已框选状态
				var isChoosedState = false;
				//置于最底部的rect，用于触发生成框选rect
				var underRect = paper.rect(0,0,Configure.constants.paperW,Configure.constants.paperH,0).drag(function(dx,dy){
					if(isChoosedState) return;
					hasMove = true;
					drawRect.attr({
						width : dx < 0 ? 0 : dx,
						height : dy < 0 ? 0 : dy
					});
				},function(x,y){
					if(isChoosedState) return;
					hasMove = false;
					var $center = $("#center");
					var offset = $center.offset();
					drawRect.show().attr({
						x : x - offset.left + $center.scrollLeft(),
						y : y - offset.top + $center.scrollTop(),
						width : 0,
						height : 0
					});
				},function(){
					var me = this;
					if(isChoosedState) return;
					if(hasMove){
						var drawRectBBox = drawRect.toFront().getBBox();
						var matchSet = paper.set();
						paper.forEach(function(el){
							var elId = el.id,
								elType = el.type;
							//找到所有框选到的elment
							//只有image元素、panel中的主面板才能被框选到
							if(elId !== drawRect.id && elId !== me.id 
									&& ((elType === 'image' && el.data("type")) || (elType === 'rect' && el.data("main"))) 
									&& Raphael.isBBoxIntersect(drawRectBBox, el.getBBox())){
								matchSet.push(el);
							}
						});
						if(matchSet.length > 0){
							drawRect.attr({
								cursor : "move"
							}).data("matchSet",matchSet);
							isChoosedState = true;
							return;
						}
					}
					restoreDrawRect();
				}).toBack().attr({
					fill : "#f2f2f2",
					"stroke-width" : 0
				}).data("underRect",true);
				Raphael.el.myBack = function(){
					this.toBack();
					underRect.toBack();
					return this;
				};
				Configure.multiple.setBgColor = function(color){
					underRect.attr({
						fill : "#" + color
					});
				};
				isInit = true;
			}
		};
	})(Configure);
	module.exports = Configure;
});