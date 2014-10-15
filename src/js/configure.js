define(['./lib/raphael/raphael-cmd-min'],function(Raphael){
	"use strict";
	/********************************paper**************************************/
	function Configure(paperId,w,h){
		this.paper = new Raphael(paperId,this.paperW = (w || 7500),this.paperH = (h || 7500));
	}
	Configure.raphael = Raphael;
	Configure.version = "1.0";
	/********************************帮助函数**************************************/
	//空函数
	var noop = Configure.noop = function(){};
	//简单扩展
	var mix = Configure.mix = function(a,b){
		a = a || {};
		b = b || {};
		for(var i in b){
			if(b[i] !== undefined){
				a[i] = b[i];
			}
		}
		return a;
	};
	//静态绑定
	Configure.bind = {};
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
	Raphael.fn.configure = function(type,typeVal,initParams,attrParams){
		return core[type].call(this,typeVal,initParams,attrParams);
	};
	/*
	扩展core
	每个属性都是一个方法，this指向当前paper,执行顺序为beforeInit > init > [typeVal]init > afterInit
	beforeInit主要对传入参数进行处理若返回值为数组，则作为init的参数
	init接收Raphael对象初始化所需参数，并进行初始化，返回Raphael对象
		Paper.path([pathString])
		Paper.image(src, x, y, width, height)
		Paper.circle(x, y, r)
		Paper.rect(x, y, width, height, [r])
	[typeVal]init 根据typeVal进行初始化

	exec(typeVal,initParams,attrParams)
	typeVal 必须为字符串
	initParams 必须为数组
	attrParams 必须为对象
	*/
	var extend = Configure.extend = function(name,options){
		var exec = core[name];
		if(exec){
			mix(exec.options,options);
		}else{
			options = mix({
				//defaultAttr中的属性值约定以_开头
				defaultAttr : {},
				beforeInit : noop,
				init : noop,
				afterInit : noop
			},options);
			exec = core[name] = function(typeVal,initParams,attrParams){
				var target = exec.options;
				attrParams = attrParams || {};
				mix(attrParams,target.defaultAttr);
				var newParams = target.beforeInit.call(this,initParams,attrParams);
				var el = target.init.apply(this,newParams || initParams);
				if(el){
					el.data({
						type : name,
						typeVal : typeVal
					});
				}
				target[typeVal] && target[typeVal].call(this,el,attrParams);
				target.afterInit.call(this,el,attrParams);
				return el;
			};
			exec.options = options;
		}
		return Configure;
	};
	Configure.getDefaultAttr = function(name){
		return core[name].options.defaultAttr;
	};
	extend("line",{
		defaultAttr : {
			_len : 150,
			_attr : {
				"stroke" : "#888",
				"stroke-width" : 5,
				"stroke-linecap" : "round",
				"cursor" : "pointer"
			}
		},
		init : function(str){
			return this.path(str);
		},
		dotted : function(path){
			path.attr("stroke-dasharray","- ");
		}
	});
	extend("connector",{
		init : function(src,x,y,w,h){
			return this.image(src,x,y,w,h);
		}
	});
	return Configure;
});