define(function(require,exports,module){
	"use strict";
	require("lib/raphael/raphael-cmd-min");
	var undefined;
	var Configure = {
		//右击各种组件时触发函数集合
		//注意this上下文指向右击的组件，并不是menu
		menu : {},
		init : function(id,w,h){
			w = w || 1500;
			h = h || 1500;
			var paperW = w * 5;
			var paperH = h * 5;
			this.constants.paperW = paperW;
			this.constants.paperH = paperH;
			this.constants.containerW = w;
			this.constants.containerH = h;
			$("#" + id).css({
				width : w,
				height : h
			});
			$("#showLeftBtn").click(function(){
				$("#monitor-west").show();
				$("#center").removeAttr("style");
				$(this).parent().hide();
				Configure.edit && $("#moduleAccordion").accordion("resize");
			});
			this.containerId = id;
			//可放大5倍
			this.paper = Raphael(id,paperW,paperH);
			this.tooltip.init();
			return this.paper;
		},
		//根据typeVal判断设备是否需要绑定实物
		isAttachEl : function(typeVal){
			var constants = this.constants;
			return typeVal === constants.waterpump || 
				typeVal === constants.blowmotor ||
				typeVal === constants.boilerinner ||
				typeVal === constants.draftmotor;
		},
		constants : {
			attach : $("#attach").val(),
			attachId : $("#attachId").val(),
			plc : 'plc',
			climate : 'climate',
			conversion : 'conversion',
			coll : 'conversion|climate',
			boiler : 'boiler',
			boilerinner : "boilerinner",
			change : "change",
			meter : 'meter',
			sensor : 'sensor',
			heatDevice : 'plc|conversion|climate|meter|sensor|boiler',
			waterpump : "waterpump",//水泵
			blowmotor : "blowmotor",//鼓风机
			draftmotor : "draftmotor",//引风机
			imgPath : $("#staticpath").val() + "/css/business/hoc/configure/modules/",
			paperW : 7500,
			paperH : 7500,
			sensorData : [{
				value : 1,text : "温度传感器",typeVal : "temp",unit : "℃"
			},{
				value : 2,text : "压力传感器",typeVal : "pressure",unit : "kPa"
			},{
				value : 3,text : "含氧量传感器",typeVal : "oxygencontent",unit : "%"
			},{
				value : 4,text : "流量传感器",typeVal : "flow",unit : "m³/h"
			},{
				value : 5,text : "液位计",typeVal : "waterlevel",unit : "L"
			},{
				value : 6,text : "电动蝶阀",typeVal : "elecbutterflyvalve",unit : "%"
			},{
				value : 7,text : "电动调节阀",typeVal : "elecadjustvalve",unit : "%"
			},{
				value : 8,text : "电动三通阀",typeVal : "elecshapevalve",unit : "%"
			},{
				value : 17,text : "水泵",typeVal : "waterpump",unit : "Hz"
			},{
				value : 18,text : "炉排",typeVal : "boilerinner",unit : "Hz"
			},{
				value : 19,text : "鼓风机",typeVal : "blowmotor",unit : "Hz"
			},{
				value : 20,text : "引风机",typeVal : "draftmotor",unit : "Hz"
			}],
			meterData : [{
				value : 9,text : "水表",typeVal : "water",unit : "m³"
			},{
				value : 10,text : "电表",typeVal : "elec",unit : "kWh"
			},{
				value : 11,text : "热表",typeVal : "heat",unit : "kWh"
			}],
			collData : [{
				value : 12,text : "气候补偿器 ",typeVal : "climate"
			},{
				value : 13,text : "变频控制器",typeVal : "conversion"
			}]
		}
	};
	Configure.imgLibData = require("common/configure/configure.imglib");
	//TODO 处理数据模块
	(function(Configure){
		function getDefaultSrcByItem(item){
			if(item.boilerId !== undefined){
				return Configure.constants.boiler;
			}else if(item.sensorId !== undefined){
				return null;
			}else if(item.meterCalcId !== undefined){
				return null;
			}else if(item.collCtrlId !== undefined){
				var typeId = item.meterTypeId;
				if(typeId === 12){
					return Configure.constants.climate;
				}else if(typeId === 13){
					return Configure.constants.change;
				}else{
					ake.log("错误数据",item);
					$.error("数据有误，暂不支持其它类型的控制设备");
				}
			}else if(item.plcCtrlId !== undefined){
				return Configure.constants.plc;
			}
		}
		function dealDevice(data,type,paper,isAttach){
			if(!data) return;
			//获取图片前缀路径
			var constants = Configure.constants;
			var path = constants.imgPath;
			//获取图片库数据
			var libData = Configure.imgLibData;
			for(var i=0,ii=data.length;i<ii;i++){
				var device = data[i];
				if(isAttach){
					var isFormat = true;
					var tpl = device.tpl;
					if(!tpl){
						isFormat = false;
					}else{
						try{
							var item = JSON.parse(device.tpl);
						}catch(ex){
							isFormat = false;
						}
					}
					if(!isFormat){
						var src = getDefaultSrcByItem(device);
						item = {
							x : 100,
							y : 100
						};
						if(src){
							$.extend(item,{
								width : 100,
								height : 100,
								src : src
							});
						}else{
							item.detail = false;
						}
					}
				}else{
					item = device;
				}
				//面板绑定实物关系
				var attachElId = item.attachElId;
				if(item.src){
					//带image的设备
					var imgLibItem = libData[item.src];
					if(!imgLibItem) continue;
					var typeVal = imgLibItem.typeVal;
					var img = paper.addImg(path + imgLibItem.src,item.x,item.y,item.width,
							item.height,type,imgLibItem.points,typeVal)
						.data("tempId",item.tempId);
					if(attachElId){
						img.data("attachElId",attachElId);
					}
					if(isAttach){
						img.data('attach',device);
						//非编辑模式 隐藏plc 变频控制器 气候补偿器
						if(!Configure.edit && (typeVal === constants.conversion || typeVal === constants.plc || typeVal === constants.climate)){
							img.hide();
							return;
						}
						Configure.tooltip.setHoverTip(img);
						if(typeVal === "boiler"){
							img.dblclick(function(){
								Configure.menu.setCurElId(this.id);
								$("#" + (Configure.edit ? "deviceMenuMonitor" : "boilerMenuMonitor")).trigger("click");
							});
						}
					}
				}else{
					//面板设备
					var rect = paper[item.detail ? "addPanelDetail" : "addPanel"](item.x,item.y,null);
					rect.data('attach',device);
					var typeVal = Configure.panel.setUnitByBean(rect, device);
					rect.data('typeVal',typeVal);
					if(attachElId){
						rect.data("attachElId",attachElId);
					}
					if(item.detail){
						Configure.panel.setText(rect,'title',device.name + (device.meterCalcId ? ("[" + device.code + "]") : ""));
					}
				}
			}
		}
		function dealPipe(data,paper){
			if(!data) return;
			for(var i=0,ii=data.length;i<ii;i++){
				var item = data[i];
				paper.addPath(item.path,{
					stroke : item.stroke,
					"stroke-width" : item["stroke-width"]
				},item["stroke-dasharray"]).data("tempId",item.tempId);
			}
		}
		function dealDottedPipe(data,paper){
			if(!data) return;
			var set = paper.set();
			for(var i=0,ii=data.length;i<ii;i++){
				var item = data[i];
				set.push(paper.addDottedPipe(item.path,{
					stroke : item.stroke,
					"stroke-width" : item["stroke-width"],
					"stroke-linecap" : "round"
				},{
					type : item.type,
					otherId : item.otherId,
					tempId : item.tempId
				}));
			}
			//编辑模式 和 预览模式 的back方法不同
			var back = Configure.edit ? "myBack" : "toBack";
			//遍历所有dottedPipe-main找到其对应的dottedPipe，互相组合绑定
			set.forEach(function(el){
				var otherId = el.data("otherId");
				if(otherId !== undefined && el.data("type") === 'dottedPipe-main'){
					this.forEach(function(target){
						if(target.data("tempId") === otherId && target.data("type") === 'dottedPipe'){
							target.data("other",el).removeData("otherId")[back]();
							el.data("other",target).removeData("otherId")[back]();
							this.edit && this.eve.attachDottedPipe(el,target,paper);
						}
					},Configure);
				}
			},set);
			return set;
		}
		function dealCircle(data,paper){
			if(!data) return;
			for(var i=0,ii=data.length;i<ii;i++){
				var item = data[i];
				var belong = item.belong;
				var circle = paper.addCircle(item.cx,item.cy,null,belong.position,"pathCircle",item.fill)
					.data("tempId",item.tempId)
					.hide();
				var el = getElByTempId(paper,belong.id);
				circle.data("belong").id = el.id;
				var set = el.data("circleSet");
				if(!set){
					set = paper.set();
					el.data("circleSet",set);
				}
				set.push(circle);
			}
		}
		function getElByTempId(paper,tempId){
			var result;
			paper.forEach(function(el){
				if(el.data("tempId") === tempId){
					result = el;
					return false;
				}
			});
			return result;
		}
		function dealConnection(conneciton,paper){
			var result = {};
			for(var i in conneciton){
				var el = getElByTempId(paper,Number(i));
				if(el){
					var item = conneciton[i];
					if(item){
						var arr = [];
						for(var j=0,jj=item.length;j<jj;j++){
							var jitem = item[j];
							var subEl = getElByTempId(paper,jitem.id);
							if(subEl){
								jitem.id = subEl.id;
								arr.push(jitem);
							}
						}
						result[el.id] = arr;
					}
				}
			}
			Configure.connect.setConnection(result);
		}
		//处理实物绑定面板关系
		function dealElAttach(paper){
			paper.forEach(function(el){
				if(el.type === 'rect' && el.data("typeVal") === Configure.constants.sensor){
					//遍历所有传感面板
					var attachElId = el.data("attachElId");
					if(attachElId){
						var stuff = getElByTempId(paper,attachElId);
						el.data("attachElId",stuff.id);
						stuff.data("attachElId",el.id);
					}
				}
			});
		}
		function loadTpl(data,paper){
			dealDevice(data.device,"device",paper);
			dealDevice(data.connector,"connector",paper);
			dealPipe(data.pipe,paper);
			dealDottedPipe(data.dottedPipe,paper);
			dealElAttach(paper);
			var $paper = $("#" + Configure.containerId);
			if(Configure.edit){
				dealCircle(data.pathCircle,paper);
				dealConnection(data.connect,paper);
				$paper.data("bgColor",data.bgColor);
			}else{
				$("#center").css("background-color","#" + data.bgColor);
			}
		}
		/**
		 * 加载所有组态数据
		 * @param data
		 * 	heat : 所有设备数据（plc 采集控制器等）
		 * 	info : 监控对象详细数据
		 */
		Configure.loadData = function(data){
			//若是预览模式 则先从tpl中获取画布的长宽信息
			var info = data.info;
			var attach = this.constants.attach;
			if(info){
				if(attach === '2'){
					var tpl = info.deviceTpl;
				}else{
					tpl = info.tpl;
				}
			}
			if(!tpl){
				tpl = {};
			}else{
				try{
					tpl = JSON.parse(tpl);
				}catch(ex){
					tpl = {}
				}
			}
			if(Configure.edit){
				var paper = this.paper;
			}else{
				paper = Configure.init("paper",tpl.x,tpl.y);
			}
			var heat = data.heat;
			var paper = this.paper;
			if(heat){
				//处理绑定数据的设备
				for(var i in heat){
					dealDevice(heat[i],'heatdevice',paper,true);
				}
			}
			if(tpl){
				loadTpl(tpl,paper);
				if(attach === '2'){
					//加载其他锅炉信息
					var other = info.other;
					if(other && other.length){
						var html = [];
						for(var i=0,ii=other.length;i<ii;i++){
							html.push("<div data-options='iconCls:\"micon-img3\"' data-id='" + other[i].boilerId + "'>" + other[i].name + "</div>");
						}
						$("body").append("<div id='changeBoilerMenu' class='hide'>" + html.join("") + "</div>");
						$("#changeBoilerMenu>div").click(function(){
							var id = $(this).attr("data-id");
							var text = $(this).find("div.menu-text").text();
							if(Configure.edit){
								parent.MonitorPageUtil.addMonitorPage("configure/edit.do",2,id,text);
							}else{
								parent.MonitorPageUtil.addMonitorWin("configure/view.do",2,id,text);
							}
						});
						$("#attachName").html("<a href='javascript:void(0)'><em id='attachNameText'>"+info.name+"</em></a>")
							.children("a").menubutton({
								plain : false,
								iconCls : 'icon-reload',
								menu : "#changeBoilerMenu"
							});
						return;
					}
				}
				$("#attachNameText").text(info.name);
			}
			if(attach !== '2'){
				//锅炉没有摄像头
				Configure.camera.add(data.camera);
			}
			return paper;
		};
	})(Configure);
	//TODO 事件绑定命名空间
	Configure.eve = {
		onMouseDown : function(el,leftClickFunc,rightClickFunc){
			return el.mousedown(function(e){
				if(e.button === 2) {
					$(document).on("contextmenu",function(){
						return false;
					});
				}
			}).mouseup(function(e){
				if(e.button === 2) {
					//右击事件
					rightClickFunc && rightClickFunc.call(this,e);
					setTimeout(function(){
						$(document).off("contextmenu");
					});
				}else{
					//左击事件
					leftClickFunc && leftClickFunc.call(this);
				}
			});
		}
	};
	//TODO tooltip模块
	(function(Configure){
		var TipPadding = 10;
		var TipExtraX = 5;
		var hoverObj;
		function getText(el){
			var attach = el.data("attach");
			return attach.name;
		}
		Configure.tooltip = {
			init : function(){
				if(hoverObj) return;
				var paper = Configure.paper;
				hoverObj = {
					position : 'right',
					text : paper.text(0,0,'').attr({
						"font-size" : "12px",
						"font-family" : "微软雅黑",
						"text-anchor" : "start"
					}).hide(),
					rect : paper.rect(0,0,10,10,5).attr({
						"stroke" : "red",
						"fill" : "#FFFFFF"
					}).hide()
				};
			},
			//设置或重置tip的size position
			setTip : function(el){
				var tipObj = el.data("tipObj");
				if(!tipObj){
					var paper = Configure.paper;
					el.data('tipObj',tipObj = {
						position : 'right',
						show : true,
						text : paper.text(0,0,getText(el)).attr({
							"font-size" : "12px",
							"font-family" : "微软雅黑",
							"text-anchor" : "start",
							opacity : 0.7
						}),
						rect : paper.rect(0,0,10,10,5).attr({
							"stroke" : "red",
							"fill" : "#FFFFFF",
							opacity : 0.7
						})
					});
				}else{
					tipObj.show = true;
					tipObj.text.show();
					tipObj.rect.show();
				}
				tipObj.text.toFront();
				this.setTipSize(el);
			},
			setHoverTip : function(el){
				el.hover(function(){
					hoverObj.rect.show().toFront();
					hoverObj.text.show().toFront();
					Configure.tooltip.setTipText(el,true);
				},function(){
					hoverObj.text.hide();
					hoverObj.rect.hide();
				});
				this.setTipText(el,true);
			},
			setTipText : function(el,isHover){
				var	tipObj = isHover ? hoverObj : el.data("tipObj");
				if(tipObj){
					tipObj.text.attr("text",getText(el));
					this.setTipSize(el,isHover);
				}
				return this;
			},
			//重置tip的size position
			setTipSize : function(el,isHover){
				var	tipObj = isHover ? hoverObj : el.data("tipObj");
				if(!tipObj) return;
				var rect = tipObj.rect,
					text = tipObj.text,
					txtbbox = text.getBBox();
				rect.attr({
					width : txtbbox.width + TipPadding,
					height : txtbbox.height + TipPadding
				});
				this.setTipPosition(el,isHover);
			},
			//重置tip的position
			setTipPosition : function(el,isHover){
				var	tipObj = isHover ? hoverObj : el.data("tipObj");
				if(!tipObj) return;
				var bbox = el.getBBox(),
					x = bbox.x + TipExtraX,
					w = bbox.width,
					y = bbox.y,
					h = bbox.height;
				var rect = tipObj.rect,
					text = tipObj.text,
					rbbox = rect.getBBox(),
					rH = rbbox.height,
					rW = rbbox.width;
				switch(tipObj.position){
					case "right" : var obj = {
						left : x + w,
						top : y - (rH - h) / 2
					};break;
					case "left" : obj = {
						left : x - rW,
						top : y - (rH - h) / 2
					};break;
					case "top" : obj = {
						left : x + (w - rW) / 2,
						top : y - rH
					};break;
					case "bottom" : obj = {
						left : x + (w - rW) / 2,
						top : y + h
					};break;
				}
				rect.attr({
					x : obj.left,
					y : obj.top
				});
				text.attr({
					x : obj.left + TipPadding / 2,
					y : obj.top + rH / 2
				});
			},
			removeTip : function(el){
				var	tipObj = el.data("tipObj");
				if(tipObj){
					tipObj.text.remove();
					tipObj.rect.remove();
				}
			}
		};
	})(Configure);
	//TODO 面板模块
	(function(Configure){
		//根据类型id获取单位
		function getUnitByTypeId(id){
			var constants = Configure.constants;
			var data = constants.sensorData.concat(constants.meterData);
			for(var i=0,ii=data.length;i<ii;i++){
				if(data[i].value === id){
					return data[i].unit;
				}
			}
		}
		Configure.panel = {
			setText : function(el,key,val){
				el.data("panelSet").forEach(function(el){
					if(el.data(key)){
						el.attr("text",val);
						return false;
					}
				});
			},
			getText : function(el,key){
				var result;
				el.data("panelSet").forEach(function(el){
					if(el.data(key)){
						result = el.attr("text");
						return false;
					}
				});
				return result;
			},
			setUnitByBean : function(el,bean){
				if(bean.meterCalcId !== undefined){
					var typeId = bean.deviceType;
					var result = 'meter';
				}else if(bean.sensorId !== undefined){
					typeId = bean.sensorType;
					result = 'sensor';
				}
				this.setText(el,"unit",getUnitByTypeId(Number(typeId)));
				return result;
			},
			getMainId : function(el){
				if(typeof el == 'number'){
					el = Configure.paper.getById(el);
				}
				//面板需找出set中的主导部分
				var set = el.data("panelSet");
				var targetId;
				set.forEach(function(el){
					if(el.data("main")){
						targetId = el.id;
						return false;
					}
				});
				return targetId;
			}
		};
	})(Configure);
	//动画效果
	(function(Configure){
		function doAdd(target,src,wFactor,hFactor,lFactor,tFactor){
			var bbox = target.getBBox();
			var x = bbox.x + bbox.width * lFactor;
			var y = bbox.y + bbox.height * tFactor;
			var w = bbox.width * wFactor;
			var h = bbox.height * hFactor;
			var result = Configure.paper.image( Configure.constants.imgPath + src,x,y,w,h);
			return result.data({
				wFactor : wFactor,
				hFactor : hFactor,
				lFactor : lFactor,
				tFactor : tFactor
			});
		}
		function rotate(el){
			var ms = el.data("rotateTime");
			if(!ms) return;
			el.transform("r0").animate({transform: "r360"}, ms, "linear", function(){
				rotate(this);
			});
		}
		Configure.move = {
			//增加叶扇
			addLeaf : function(motor){
				motor.attr("cursor",Configure.edit ? "move" : "pointer");
				var leaf = doAdd(motor,"device/leaf.png",0.5444,0.5896,0.2667,0.1514);
				rotate(leaf.data("rotateTime",500));
				motor.data("leaf",leaf);
			},
			//增加火焰
			addFire : function(boiler){
				var fire = doAdd(boiler,"fire/fire1.png",0.6902,0.3164,0.1384,0.4432);
				//当前显示的火焰索引
				var curI = 1;
				//火焰数目
				var size = 4;
				var d = 1;
				var t = setInterval(function(){
					curI += d;
					if(curI === size){
						d = -1;
					}else if(curI === 1){
						d = 1;
					}
					fire.attr("src",Configure.constants.imgPath + "fire/fire" + curI + ".png");
				},200);
				fire.data("interval",t);
				boiler.data("fire",fire);
			}
		};
	})(Configure);
	//摄像头模块
	(function(Configure){
		var isShow = true;
		$("#camerapanelbtn").click(function(){
			$("#cameracontent").toggle();
			isShow = !isShow;
			$(this).linkbutton("setIconTxt",{
				iconCls : isShow ? "icon-down" : "icon-up",
				text : isShow ? "隐藏摄像区域" : "显示摄像区域"
			});
		});
		function doAdd(camera){
			if(Configure.edit){
				var content = "<div class='emptymes'>摄像区域</div>";
			}else{
				content = "<div class='cameraarea bbottom abfit'><div class='emptymes'>摄像区域</div></div>" + 
						  "<div class='camerabtnbar'>" + 
						  	"<a href='javascript:void(0)' class='play' title='播放'></a>" + 
						  	"<a href='javascript:void(0)' class='camerabtn-disable stop' title='停止'></a>" + 
						  "</div>";
			}
			var $html = $("<div class='camera-item cameracontent-con' id='camera-" + camera.cameraId + "'>" + content + "</div>");
			if(Configure.edit){
				$("#addcameradv").before($html);
			}else{
				$("#cameracontent").append($html);
			}
			$html.data("camera",camera).hover(function(){
				var keyArr = ["code","userName","ip","port"],
					$this = $(this),
					camera = $this.data("camera"),
					$tip = $("#cameratip").css({
						left : 0,top : 0
					}),
					key;
				for(var i=0,ii=keyArr.length;i<ii;i++){
					key = keyArr[i];
					$tip.find("span.camera-" + key).text(camera[key]);
				}
				var pos = $this.offset();
				$tip.show().css({
					left : pos.left - $tip.outerWidth() - 8
				});
			},function(){
				$("#cameratip").hide();
			}).mousemove(function(e){
				var $tip = $("#cameratip");
				$tip.css("top",(e.pageY - $tip.innerHeight() / 2) + "px");
			});
			if(Configure.edit){
				$html.mousedown(function(e){
					if(e.button === 2){
						$(document).on("contextmenu",function(){
							return false;
						});
					}
				}).mouseup(function(e){
					if(e.button === 2){
						$("#cameraMenu").menu("show",{
							left : e.clientX,
							top : e.clientY
						}).data("cameraId",$(this).attr("id"));
						window.setTimeout(function(){
							$(document).off("contextmenu");
						});
					}
				});
			}
		}
		Configure.camera = {
			add : function(camera){
				if($.type(camera) === "object"){
					doAdd(camera);
				}else{
					$("#cameracontent").children("div.camera-item").remove();
					if(!camera || camera.length === 0){
						if(!Configure.edit){
							//没有任何摄像头数据 在预览模式下 移除摄像头区域
							$("#cameratip,#camerapanel").remove();
						}
						return;
					}
					for(var i=0,ii=camera.length;i<ii;i++){
						doAdd(camera[i]);
					}
				}
			},
			reload : function(){
				ake.ajax("getCameraList.do",{
					attach : Configure.constants.attach,
					attachId : Configure.constants.attachId
				},function(data,mes){
					if(data){
						Configure.camera.add(data);
					}else{
						MES.alert(mes);
					}
				},$("#camerapanel"));
			}
		};
	})(Configure);
	//扩展模块
	(function(Configure){
		function getTextObj(color){
			return {
				"font-size" : "12px",
				"fill" : color,
				"font-family" : "宋体",
				"text-anchor" : "start",
				cursor : "pointer"
			};
		}
		function afterMake(set){
			var isEdit = Configure.edit;
			set.forEach(function(el){
				el.data('panelSet',this);
				if(!isEdit){
					Configure.eve.onMouseDown(el,null,Configure.menu.panelMenu);
					el.dblclick(function(){
						Configure.menu.setCurElId(Configure.panel.getMainId(this.id));
						$("#panelMenuDetail").trigger('click');
					});
				}
			},set);
			isEdit && Configure.eve.attachPanel(set);
		}
		$.extend(Raphael.fn,{
			/**
			 * 添加rect面板
			 * data : {
			 * 	main : 是否主面板
			 * 	panelSet 
			 *  typeVal
			 * }
			 */
			addPanel : function(x,y,typeVal){
				this.setStart();
				var rect = this.rect(x,y,0,0,3).attr({
					"stroke" : "#d2d2d2",
					"fill" : "#f2f2f2",
					cursor : "pointer"
				});
				var value = this.text(x + 5,y,'--').attr(getTextObj("red")).toFront().data("value",true);
				var valueBBox = value.getBBox();
				var textY = y + 5 + valueBBox.height / 2;
				value.attr('y',textY);
				var unit = this.text(valueBBox.x + valueBBox.width + 5,textY,'--').attr(getTextObj("red")).data("unit",true);
				var unitBBox = unit.getBBox();
				rect.attr({
					width : valueBBox.width + unitBBox.width + 23,
					height : valueBBox.height + 10
				}).data({
					main : true,
					typeVal : typeVal
				}).toFront();
				value.toFront();
				unit.toFront();
				//绑定事件
				var set = this.setFinish();
				afterMake(set);
				return rect;
			},
			addPanelDetail : function(x,y,typeVal){
				this.setStart();
				var outerRect = this.rect(x,y,0,0,0);
				//生成title
				var title = this.text(x + 5,y,'待设置').attr(getTextObj('blue')).data("title",true);
				var titleBBox = title.getBBox();
				var titleY = y + 5 + titleBBox.height / 2;
				//调整title y轴坐标
				title.attr("y",titleY);
				//生成数值面板
				var rect = this.rect(titleBBox.x,y + 5 + titleBBox.height + 5,70,0,1);
				rect.attr({
					"stroke" : "#000",
					"fill" : "#000",
					cursor : "pointer"
				});
				//生成数值
				var value = this.text(titleBBox.x + 5,y,'等待读取')
					.attr(getTextObj('#DC2811')).data('value',true);
				var valueBBox = value.getBBox();
				var rectBBox = rect.attr("height",valueBBox.height + 10).getBBox();
				var valueY = rectBBox.y + 5 + valueBBox.height / 2;
				value.attr("y",valueY);
				//生成单位
				var unit = this.text(rectBBox.x + rectBBox.width + 5,valueY,'--')
					.attr(getTextObj('blue')).data('unit',true);
				outerRect.attr({
					"stroke" : "#d2d2d2",
					"fill" : "90-#ccc-#f2f2f2",
					width : rectBBox.width + unit.getBBox().width + 25,
					height : titleBBox.height + rectBBox.height + 15,
					cursor : "pointer"
				}).toFront().data({
					main : true,
					typeVal : typeVal,
					detail : true
				});
				rect.toFront();
				title.toFront();
				value.toFront();
				unit.toFront();
				var set = this.setFinish();
				afterMake(set);
				return outerRect;
			}
		});
	})(Configure);
	module.exports = Configure;
});