define(function(require,exports,module){
	"use strict";
	var Configure = require("configure");
	require("common/jquery/timer");
	var eve = Configure.eve;
	var constants = Configure.constants;
	Configure.edit = false;
	//扩展
	$.extend(Raphael.fn,{
		addImg : function(src,x,y,w,h,type,points,typeVal){
			var img = this.image(src,x,y,w,h)
				.data("connectPoints",points)
				.data("type",type)
				.data("typeVal",typeVal);
			if(typeVal === constants.boiler){
				eve.onMouseDown(img,null,Configure.menu.boilerMenu);
			}else if(typeVal === constants.blowmotor || typeVal === constants.draftmotor){
				//风机的话要同时生成叶扇
				eve.onMouseDown(img,function(){
					//引风鼓风控制
					var $win = $("#windWin").show();
					var elY = this.attr("y");
					var y = elY - $win.outerHeight() - 3;
					if(y < 0){
						y = elY + this.attr("height") + 3;
					}
					$win.css({
						left : this.attr("x"),
						top : y
					});
					var panel = Configure.paper.getById(this.data("attachElId"));
					var attach = panel.data("attach");
					if(this.data("typeVal") === constants.blowmotor){
						var title = "鼓风机("+attach.name+")";
					}else{
						title = "引风机("+attach.name+")";
					}
					$win.find("h1").text(title);
				});
				Configure.move.addLeaf(img);
			}else if(typeVal === constants.boilerinner){
				//生成火焰
				Configure.move.addFire(img);
			}
			if(typeVal === Configure.constants.plc){
				$("#noplc").hide();
			}
			return img.toBack();
		},
		addPath : function(x,y,dash){
			var path = this.path(x).attr(y || {});
			if(dash){
				path.attr("stroke-dasharray",dash);
			}
			path.attr("cursor","pointer").toBack()
				.data("type","pipe");
			return path;
		},
		addDottedPipe : function(x,y,z){
			if(z.type === 'dottedPipe'){
				y["stroke-dasharray"] = "-";
			}
			return this.path(x).attr(y).data(z);
		}
	});
	//缩放模块
	(function(Configure){
		function doZoom(factor){
			var w = constants.paperW * factor,
				h = constants.paperH * factor;
			Configure.paper.setViewBox(0,0,w,h);
		}
		function doChange(val){
			doZoom(1 / val);
			var w = constants.containerW * val,
				h = constants.containerH * val;
			$("#paper").css({
				width : w,
				height : h
			});
		}
		var curFactor = 1;
		$("#operBar a[data-step]").click(function(){
			var step = Number($(this).attr("data-step"));
			if(step === 1){
				curFactor = 1;
			}else{
				curFactor += step;
			}
			if(curFactor <= 0.8){
				curFactor = 0.8;
			}else if(curFactor >= 5){
				curFactor = 5;
			}
			doChange(curFactor);
		});
	})(Configure);
	//鼠标滚动模块
	(function(Configure){
		var	curLeft = 0,
			curTop = 0;
		$("#center").mousedown(function(e){
			if(e.button === 2) return;
			var sX = e.pageX,
				sY = e.pageY,
				tempLeft = curLeft,
				tempTop = curTop;
			var $this = $(this).removeClass("openhand").addClass("closedhand");
			$(document).mousemove(function(e){
				e.preventDefault();
				var dx = e.pageX - sX,
					dy = e.pageY - sY;
				curLeft = $this.scrollLeft(tempLeft - dx).scrollLeft();
				curTop = $this.scrollTop(tempTop - dy).scrollTop();
			}).mouseup(function(){
				$(this).off("mouseup").off("mousemove");
				$this.removeClass("closedhand").addClass("openhand");
			});
		});
	})(Configure);
	$("#timer").timer({
		serverTime : Number($("#servertime").val()),
		timeGap : 200,
		func : function(){
			setTimeout(function(){
				$("#timer").timer("reset").timer("start");
			},3000);
		}
	});
	module.exports = Configure;
});