define(['./lib/raphael/raphael-cmd-min'],function(Raphael){
	"use strict";
	/********************************paper**************************************/
	function Configure(paperId,w,h){
		this.paper = new Raphael(paperId,this.paperW = (w || 7500),this.paperH = (h || 7500));
		this.paper.configure = this;
	}
	Configure.raphael = Raphael;
	Configure.version = "1.0";
	Configure.prototype.add = function(type){
		var arg = Array.prototype.slice.call(arguments,1);
		return core[type].init.apply(this.paper,arg);
	};
	/********************************帮助函数**************************************/
	//空函数
	var noop = Configure.noop = function(){};
	//简单扩展
	var mix = Configure.mix = function(a,b){
		for(var i in b){
			if(b[i] !== undefined){
				a[i] = b[i];
			}
		}
		return a;
	};
	/********************************element**************************************/
	(function(){
		var $func = Configure.$ = function(element){
			return new $func.prototype.init(element);
		};
		mix($func.prototype,{
			init : function(element){
				this.el = element;
				return this;
			},
			rightClick : function(func){
				this.el.mousedown(function(e){
					if(e.button === 2){
						var me = this;
						var oncontextmenu = document.oncontextmenu;
						document.oncontextmenu = function(){
							oncontextmenu && oncontextmenu.apply(this,arguments);
							func.call(me,e);
							document.oncontextmenu = oncontextmenu;
							return false;
						};
					}
				});
				return this;
			}
		}).init.prototype = $func.prototype;
	})();
	/********************************core**************************************/
	var core = Configure.core = {};
	/*
	扩展core
	*/
	var extend = Configure.extend = function(name,options){
		if(core[name]){
			mix(core[name],options);
		}else{
			options = mix({
				defaultAttr : {},
				init : noop,
				beforeInit : noop,
				afterInit : noop
			},options);
			var _init = options.init;
			//init函数的第一个参数必须为typeVal,且必须返回Raphael对象
			//this指向当前paper
			options.init = function(typeVal){
				var result = options.beforeInit.apply(this,arguments);
				//采用beforeInit的返回值为参数列表,若没返回则采用arguments
				var el = _init.apply(this,result || arguments);
				el.data({
					type : name,
					typeVal : typeVal
				});
				var newArg = [el].concat(Array.prototype.slice.call(arguments));
				options[typeVal] && options[typeVal].apply(this,newArg);
				options.afterInit.apply(this,newArg);
				return el;
			};
			core[name] = options;
		}
		return core[name];
	};
	Configure.getDefaultAttr = function(name){
		return core[name].defaultAttr;
	};
	extend("line",{
		defaultAttr : {
			len : 150,
			attr : {
				"stroke" : "#888",
				"stroke-width" : 5,
				"stroke-linecap" : "round",
				"cursor" : "pointer"
			}
		},
		init : function(str,attr){
			return this.path(str).attr(attr);
		},
		dotted : function(path){
			path.attr("stroke-dasharray","- ");
		}
	});
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
	extend("connector",{
		init : function(typeVal,src,x,y,w,h,points){
			return this.image(src,x,y,w,h).data("connectPoints",typeof points == 'object' 
				? points : getPoints(points));
		}
	});
	return Configure;
});