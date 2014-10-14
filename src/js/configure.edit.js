define(["./configure","./connect"],function(Configure,ConnInit){
	"use strict";
	var Connect = ConnInit(Configure);
	//编辑模式
	Configure.edit = true;
	var fn = Configure.$.prototype;
	(function(){
		function edage(x,y,bbox){
			var maxX = Configure.paperW;
			var maxY = Configure.paperH;
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
		var dragFunc = {
			path : function(paper){
				this.drag(function(dx,dy){
					var arr = Configure.raphael.parsePathString(this.sPath);
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
			image : function(paper){
				this.drag(function(dx,dy){
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
									if(Configure.raphael.isPointInsideBBox(bbox, x, y)){
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
			circle : function(paper){
				this.drag(function(dx,dy){
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
					if(this.data("typeVal") === 'pathCircle'){
						if(!this.data("connect")){
							var x = this.attr("cx");
							var y = this.attr("cy");
							var me = this;
							paper.forEach(function(el){
								var type = el.data("type");
								if(type === "connector" || type === 'device' || type === 'heatdevice'){
									var bbox = el.getBBox();
									if(Configure.raphael.isPointInsideBBox(bbox,x,y)){
										Connect.pathToConnector(this,me,el,bbox,x,y);
										return false;
									}
								}
							},paper);
						}
					}
				});
			}
		};
		fn.drag = function(){
			var el = this.el;
			dragFunc[el.type].call(el,el.paper);
			return this;
		};
	})();
	(function(){
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
		var clickFunc = {
			path : function(paper){
				this.click(function(){
					if(this.noSel) return;
					var re = isSelected(this);
					if(re){
						re.method("hide");
						paper._curPath = null;
					}else{
						//取消选中当前的path
						paper._curPath && paper._curPath.data("circleSet").method("hide");
						var set = this.data("circleSet");
						if(!set){
							var sp = this.getPointAtLength(0),
								ep = this.getPointAtLength(this.getTotalLength());
							var newSet = paper.set();
							var id = this.id;
							var init = Configure.core.circle.init;
							newSet.push(
								init.call(paper,"pathCircle",sp.x,sp.y,id,0,"#d2d2d2"),
								init.call(paper,"pathCircle",ep.x,ep.y,id,1,"#d2d2d2")
							);
							this.data("circleSet",newSet);
						}else{
							set.method("show");
						}
						paper._curPath = this;
					}
				});
			},
			image : function(){

			}
		};
		fn.click = function(){
			var el = this.el;
			clickFunc[el.type].call(el,el.paper);
			return this;
		};
	})();
	Configure.extend("line",{
		beforeInit : function(typeVal,x,y){
			var obj = Configure.getDefaultAttr("line");
			if(typeof x == 'number'){
				return [["M",x," ",y,"L",x + obj.len," ",y].join(""),obj.attr];
			}else{
				return [x,y || {}];
			}
		},
		afterInit : function(el){
			Configure.$(el).click().rightClick(function(){
				alert("line");
			}).drag();
		}
	});
	Configure.extend("circle",{
		defaultAttr : {
			stroke : "green",
			fill : "#66ff33",
			size : 5
		},
		init : function(typeVal,x,y,id,position,bgColor){
			var defaultAttr = Configure.getDefaultAttr("circle");
			var circle = this.circle(x,y,defaultAttr.size);
			if(position !== undefined){
				var cursor = ["nw-resize","ne-resize","sw-resize","se-resize"][position];
			}else{
				cursor = "nw-resize";
			}
			var $circle = Configure.$(circle);
			if(typeVal === "pathCircle"){
				$circle.rightClick(function(){
					alert("circle");
				});
			}
			$circle.drag();
			return circle.attr({stroke : defaultAttr.stroke,fill : bgColor || defaultAttr.fill,cursor : cursor})
				.data("belong",{id : id,position : position})
				.toFront();
		}
	});
	Configure.extend("connector",{
		afterInit : function(connector){
			Configure.$(connector).rightClick(function(){
				alert("connector");
			}).drag();
		}
	});
	//扩展set
	(function(Raphael){
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
	})(Configure.raphael);
	return Configure;
});