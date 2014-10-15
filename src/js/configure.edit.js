define(["./configure","./connect"],function(Configure,ConnInit){
	"use strict";
	var Connect = ConnInit(Configure);
	var Bind = Configure.bind;
	Configure.mix(Configure.prototype,{
		//当前选中的path
		curPath : null,
		//存放所有选择的img元素
		clickEl : [],
		//清空所有或特定选择的元素
		clearChoose : function(target){
			var clickEl = this.clickEl;
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
	});
	//编辑模式
	Configure.edit = true;
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
			path : function(configure){
				var paper = configure.paper;
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
						if(!this.data("main")){
							//同时移动虚线管道两端的连线圆
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
			image : function(configure){
				var paper = configure.paper;
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
			circle : function(configure){
				var paper = configure.paper;
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
		Bind.drag = function(el,configure){
			dragFunc[el.type].call(el,configure);
			return Bind;
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
		function clickPath(configure){
			var paper = configure.paper;
			if(this.noSel) return;
			var re = isSelected(this);
			if(re){
				re.method("hide");
				configure.curPath = null;
			}else{
				//取消选中当前的path
				configure.curPath && configure.curPath.data("circleSet").method("hide");
				var set = this.data("circleSet");
				if(!set){
					var sp = this.getPointAtLength(0),
						ep = this.getPointAtLength(this.getTotalLength());
					var newSet = paper.set();
					var id = this.id;
					newSet.push(
						configure.add("circle","pathCircle",[sp.x,sp.y],{
							id : id,position : 0,bgColor : "#d2d2d2"
						}),
						configure.add("circle","pathCircle",[ep.x,ep.y],{
							id : id,position : 1,bgColor : "#d2d2d2"
						})
					);
					this.data("circleSet",newSet);
				}else{
					set.method("show");
				}
				configure.curPath = this;
			}
		}
		var clickFunc = {
			path : function(configure){
				this.click(function(){
					clickPath.call(this,configure);
				});
			},
			image : function(configure){
				this.click(function(){
					var paper = configure.paper;
					if(this.noSel) return;
					//选择或取消选择el
					//目前只支持单选
					var re = isSelected(this);
					if(re){
						re.method("hide");
					}else{
						configure.clearChoose();
						var set = this.data("circleSet");
						if(!set){
							var bbox = this.getBBox();
							var newSet = paper.set();
							var id = this.id;
							newSet.push(
								configure.add("circle","imgCircle",[bbox.x,bbox.y],{
									id : id,position : 0
								}),
								configure.add("circle","imgCircle",[bbox.x2,bbox.y],{
									id : id,position : 1
								}),
								configure.add("circle","imgCircle",[bbox.x,bbox.y2],{
									id : id,position : 2
								}),
								configure.add("circle","imgCircle",[bbox.x2,bbox.y2],{
									id : id,position : 3
								})
							);
							this.data("circleSet",newSet);
						}else{
							set.method("show");
						}
						//加入选中数组
						configure.clickEl.push(this);
					}
				});
			}
		};
		Bind.click = function(el,configure){
			clickFunc[el.type].call(el,configure);
			return Bind;
		};
		Bind.click.path = clickPath;
	})();
	Configure.extend("line",{
		beforeInit : function(initParams,attrParams){
			var x = initParams[0];
			if(typeof x == 'number'){
				var y = initParams[1];
				return [["M",x," ",y,"L",x + attrParams._len," ",y].join("")];
			}else{
				return [x];
			}
		},
		afterInit : function(el,attrParams){
			el.attr(attrParams._attr);
			Bind.click(el,this).drag(el,this);
			Configure.$(el).rightClick(function(){
				alert("line");
			});
		},
		double : function(path,attrParams){
			path.attr(attrParams._innerAttr);
			var outerPath = this.paper.path(path.attr("path")).attr(attrParams._outerAttr);
			outerPath.toFront().data("other",path);
			path.toFront().data("other",outerPath).data("main",true);
			var me = this;
			//点击outerPath时触发path的点击事件
			outerPath.click(function(){
				Bind.click.path.call(path,me);
			});
			Bind.drag(outerPath,me);
			Configure.$(outerPath).rightClick(function(){
				alert("double");
			});
		}
	}).extend("circle",{
		defaultAttr : {
			_stroke : "green",
			_fill : "#66ff33",
			_size : 5
		},
		beforeInit : function(initParams,attrParams){
			return initParams.concat(attrParams._size);
		},
		init : function(x,y,r){
			return this.circle(x,y,r);
		},
		afterInit : function(circle,attrParams){
			if(attrParams.position !== undefined){
				var cursor = ["nw-resize","ne-resize","sw-resize","se-resize"][attrParams.position];
			}else{
				cursor = "nw-resize";
			}
			circle.attr({stroke : attrParams._stroke,fill : attrParams.bgColor || attrParams._fill,cursor : cursor})
				.data("belong",{id : attrParams.id,position : attrParams.position})
				.toFront();
			Bind.drag(circle,this);
		},
		pathCircle : function(circle){
			Configure.$(circle).rightClick(function(){
				alert("circle");
			});
		}
	});
	(function(){
		function getPoints(str){
			if(!str) return null;
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
		function common(el,attrParams,rightClickFunc){
			var points = attrParams.points;
			points && el.data("connectPoints",typeof points == 'object' 
				? points : getPoints(points));
			Bind.drag(el,this);
			Configure.$(el).rightClick(rightClickFunc);
		}
		Configure.extend("connector",{
			afterInit : function(connector,attrParams){
				common.call(this,connector,attrParams,function(){
					alert("connector");
				});
			}
		}).extend("device",{
			afterInit : function(device,attrParams){
				common.call(this,device,attrParams,function(){
					alert("device");
				});
				Bind.click(device,this);
			}
		});
	})();
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