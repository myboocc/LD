define('cart.commonv2', function(require, exports, module) {
	var $;
	var cartCommon = {
		deleteUrl: '/cart/index/ajax_delete_item',
		editNumUrl: '/cart/index/ajax_change_sku_num',
		changeCheckStatusUrl: '/cart/index/ajax_update_check_state',
		changeAllCheckStatusUrl: '/cart/index/ajax_update_all_cart_check_state',
		clearExpireCartItemUrl: '/cart/index/ajax_clear_expire_cart_item',
		addCollectDelBatchUrl: '/cart/index/ajax_add_collect_del_batch',
		getSkuActiveListUrl: '/cart/index/ajax_get_active_list_by_id',
		queryGiftUrl: '/cart/index/ajax_query_gift',
		updateGiftUrl: '/cart/index/ajax_update_gift',
		updateActUrl: '/cart/index/ajax_update_act',
		deleteGiftUrl: '/cart/index/ajax_delete_gift'
	};
	cartCommon.method = {
		commonGetActiveList: function(para) {
			var ajaxUrl = cartCommon.getSkuActiveListUrl;
			this.commonAjax(para, ajaxUrl);
		},
		commonDelete: function(para) {
			var ajaxUrl = cartCommon.deleteUrl;
			this.commonAjax(para, ajaxUrl, 'delete');
		},
		commonCollectDel: function(para) {
			var ajaxUrl = cartCommon.addCollectDelBatchUrl;
			this.commonAjax(para, ajaxUrl, 'collect');
		},
		commonEditNum: function(para) {
			var ajaxUrl = cartCommon.editNumUrl;
			this.commonAjax(para, ajaxUrl, 'num');
		},
		commonChangeAllCheckStatus: function(para) {
			var ajaxUrl = cartCommon.changeAllCheckStatusUrl;
			this.commonAjax(para, ajaxUrl, 'allStatus');
		},
		commonChangeCheckStatus: function(para) {
			if(para._data.sku_id == 0) {
				para._check('请至少选择一件商品');
			} else {
				var ajaxUrl = cartCommon.changeCheckStatusUrl;
				this.commonAjax(para, ajaxUrl, 'status');
			}
		},
		commonClearExpireCatItem: function(para) {
			var ajaxUrl = cartCommon.clearExpireCartItemUrl;
			this.commonAjax(para, ajaxUrl, 'expire');
		},
		commonQueryGift: function(para) {
			var ajaxUrl = cartCommon.queryGiftUrl;
			this.commonAjax(para, ajaxUrl);
		},
		commonUpdateGift: function(para) {
			var ajaxUrl = cartCommon.updateGiftUrl;
			this.commonAjax(para, ajaxUrl);
		},
		commonQueryAct: function(para) {
			var ajaxUrl = cartCommon.updateActUrl;
			this.commonAjax(para, ajaxUrl);
		},
		commonDeleteGift: function(para) {
			var ajaxUrl = cartCommon.deleteGiftUrl;
			this.commonAjax(para, ajaxUrl);
		},
		commonAjax: function(para, ajaxUrl, type) {
			var me = this;
			var time = 10000;
			if(type == 'num') {
				time = 8000;
			}
			if(window.fsId) {
				para['_data']['fsid'] = window.fsId;
			}
			$.ajax({
				type: 'POST',
				data: para._data,
				url: ajaxUrl,
				timeout: time,
				dataType: 'json',
				success: function(data) {
					para._success(data, para._curObj);
				},
				error: function(data) {
					para._error(data, para._curObj);
				}
			});
		}
	};
	exports.init = function(type) {
		$ = type;
		return cartCommon;
	}
});
define("cookie", function(require, exports, module) {
	exports.get = getCookie;
	exports.set = setCookie;
	exports.getC = getCookieV2;
	exports.setC = setCookieV2;
	exports.del = delCookie;

	function getCookie(name) {
		var reg = new RegExp("(^| )" + name + "(?:=([^;]*))?(;|$)"),
			val = document.cookie.match(reg);
		return val ? (val[2] ? unescape(val[2]) : "") : null;
	}

	function getCookieV2(name) {
		var reg = new RegExp("(^| )" + name + "(?:=([^;]*))?(;|$)"),
			val = document.cookie.match(reg);
		return val ? (val[2] ? decodeURIComponent(val[2]) : "") : null;
	}

	function setCookie(name, value, expires, path, domain, secure) {
		var exp = new Date(),
			expires = arguments[2] || null,
			path = arguments[3] || "/",
			domain = arguments[4] || null,
			secure = arguments[5] || false;
		expires ? exp.setMinutes(exp.getMinutes() + parseInt(expires)) : "";
		document.cookie = name + '=' + escape(value) + (expires ? ';expires=' + exp.toGMTString() : '') + (path ? ';path=' + path : '') + (domain ? ';domain=' + domain : '') + (secure ? ';secure' : '');
	}

	function setCookieV2(name, value, expires, path, domain, secure) {
		var exp = new Date(),
			expires = arguments[2] || null,
			path = arguments[3] || "/",
			domain = arguments[4] || null,
			secure = arguments[5] || false;
		expires ? exp.setMinutes(exp.getMinutes() + parseInt(expires)) : "";
		document.cookie = name + '=' + encodeURIComponent(value) + (expires ? ';expires=' + exp.toGMTString() : '') + (path ? ';path=' + path : '') + (domain ? ';domain=' + domain : '') + (secure ? ';secure' : '');
	}

	function delCookie(name, path, domain, secure) {
		var value = getCookie(name);
		if(value != null) {
			var exp = new Date();
			exp.setMinutes(exp.getMinutes() - 1000);
			path = path || "/";
			document.cookie = name + '=;expires=' + exp.toGMTString() + (path ? ';path=' + path : '') + (domain ? ';domain=' + domain : '') + (secure ? ';secure' : '');
		}
	}
});
define('formatJson', function(require, exports, module) {
	var _formatJson_cache = {};

	$formatJson = function(str, data) {
		/* 模板替换,str:模板id或者内容，data:数据内容
			\W：匹配任何非单词字符。等价于 '[^A-Za-z0-9_]'。 
			如果是id,并且cache中有值，直接返回，否则获取innerHTML，再次解析；
			如果不是id，解析并存入cache
		 */
		var fn = !/\W/.test(str) ?
			_formatJson_cache[str] = _formatJson_cache[str] || $formatJson(document.getElementById(str).innerHTML) :
			new Function("obj",
				"var p=[],print=function(){p.push.apply(p,arguments);};" +
				"with(obj){p.push('" + str
				.replace(/[\r\t\n]/g, " ")
				.split("<%").join("\t")
				.replace(/((^|%>)[^\t]*)'/g, "$1\r")
				.replace(/\t=(.*?)%>/g, "',$1,'")
				.split("\t").join("');")
				.split("%>").join("p.push('")
				.split("\r").join("\\'") + "');}return p.join('');");
		return data ? fn(data) : fn;
	}

	exports.render = $formatJson;
});
define('mmd.address', function(requier, exports, module) {
	var $ = Zepto = require('zepto');
	(function($) {
		var MmdAddress;
		MmdAddress = (function() {
			function MmdAddress(element, options) {
				this.settings = $.extend({}, $.fn.mmdAddress.defaults, options);
				this.$element = $(element);
				this.addrData = bbcDistrictData;
				this.flag = false;
				this.isTopLevel = false;
				this.style = '<style id="addressWrapStyle">' + '.address_wrap{position:fixed;z-index:999999;top:0;left:0;width:100%;height:100%;overflow-y: auto;background-color:#fff;/*-webkit-overflow-scrolling: touch*/}' + '.address_header{position: fixed;top: 0;left: 0;right: 0;width: 100%;z-index: 50;}' + '.address_wrap.no_header .address_header{display:none;}' + '.address_wrap.no_header .address_main_wrap{margin-top:0!important}' + '.address_hd_wrap {height:50px;line-height: 60px;background-color: #fff;position: relative;overflow: hidden;z-index: 999;border-bottom: 1px solid #d6d6d6;-webkit-tap-highlight-color: transparent;}' + '.address_hd_wrap .address_col_left {position: absolute;width: 60px;height: 60px;}' + '.address_hd_wrap .address_hd_back{display:block;width: 20px;height: 22px;    margin: 13px auto;background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAA5CAMAAABgfdmVAAAAVFBMVEUAAAAAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAktgAkti92RYdAAAAG3RSTlMABXPTB4VtJc6KK/rKLiiSaI9415RPE+LBl1XYppneAAAAfklEQVQ4y93MSRKAIAxE0eA8oYizuf89XVguoSnFsrC3/yVkmdSTsPWUmRdh78w76ByBzhXoEega3b/Uy5/33rFnN3v3cR9Rd/yvDF2CTvrsG5k2naDOjSJGIhk8iNhVsA/Rhi/EJSqjKIIT8oFoPIoZCUVAKAJiJotI6zWnAy22K5CGCjl7AAAAAElFTkSuQmCC);background-repeat: no-repeat;background-size:10px auto;background-position:4px 3px;}' + '.address_hd_wrap .address_col_middle {margin: 0 60px;height: 50px;text-align: center;position: relative;overflow: hidden;}' + '.address_hd_wrap .address_col_middle h1 {font-size: 18px;line-height: 50px;color: #0093d5;font-weight: normal;}' + '.address_main_wrap {margin-top: 50px !important;}' + '.address_main_wrap .area_list li{height:50px;line-height:50px;font-size:14px;padding:0 20px;border-bottom:1px solid #eee;background-color:#fff}' + '</style>';
				this.wrapTemplate = '<div id="mmdAddressWrap" class="address_wrap hide"><div class="address_header"><div class="address_hd_wrap"><div class="address_col_left J_address_back"><a href="javascript:;"><i class="address_hd_back" attr-tag="backBtn"></i></a></div><div class="address_col_middle"><h1 id="title">地区选择</h1></div></div></div><div class="address_main_wrap"><div class="swap_page_wrap"><ul id="areaListWrap" class="area_list"></ul></div></div></div>';
				this.itemTemplate = '<li data-code="{{code}}">{{value}}</li>';
				this.init();
			}
			MmdAddress.prototype = {
				constructor: MmdAddress,
				get_param: function(name, url) {
					var u = arguments[1] || window.location.search,
						reg = new RegExp("(^|&)" + name + "=([^#&]*)(&|#|$)"),
						r = u.substr(u.indexOf("?") + 1).match(reg);
					return r != null ? r[2] : "";
				},
				dataFilter: function(code, data) {
					var separator = this.get_param('separator') || ',';
					var level = code.match(/\d{2}/g),
						tempData, retData, retText = '';
					if(level[0] != 0) {
						tempData = data[level[0] + '0000'];
						retText = tempData[0];
						retData = tempData[1];
					}
					if(level[1] != 0) {
						tempData = tempData[1][level[0] + level[1] + '00'];
						retText = retText + separator + tempData[0];
						retData = tempData[1];
					}
					if(level[2] != 0) {
						tempData = tempData[1];
						retText = retText + separator + tempData[code];
						retData = undefined;
					}
					return {
						'code': code,
						'text': retText,
						'data': retData
					};
				},
				parseCode: function(code) {
					var separator = this.get_param('separator') || ',';
					var retCode = '',
						level = code.match(/\d{2}/g);
					if(level[0] != 0) {
						retCode = level[0] + '0000';
					}
					if(level[1] != 0) {
						retCode = retCode + separator + level[0] + level[1] + '00';
					}
					if(level[2] != 0) {
						retCode = retCode + separator + code;
					}
					return retCode;
				},
				render: function(data) {
					this.$areaListWrap = $('#areaListWrap');
					var htmlStr = '';
					for(var code in data) {
						if(data.hasOwnProperty(code)) {
							htmlStr += this.itemTemplate.replace('{{code}}', code).replace('{{value}}', function() {
								if(typeof data[code] == 'object') {
									return data[code][0];
								} else if(typeof data[code] == 'string') {
									return data[code];
								}
							});
						}
					}
					this.$areaListWrap.html(htmlStr);
					$('#mmdAddressWrap').scrollTop(0);
				},
				_buildLayer: function() {
					if($('#mmdAddressWrap').length == 0) {
						var $layerDom = $(this.wrapTemplate);
						$('head').append(this.style);
						$('body').append($layerDom);
					}
					this.$layer = $('#mmdAddressWrap');
					this.render(this.addrData);
					if(this.get_param('appview') == '1') {
						this.$layer.addClass('no_header');
					}
				},
				_openLayerEvent: function() {
					var _self = this;
					$(this.$element).on('click', function(e) {
						console.log('sdfsdfsdf');
						e.preventDefault();
						_self.open();
						if(_self.settings.hash) {
							window.location.hash = 'address:0';
							_self._listenHash();
						}
						_self._backEvent();
					})
				},
				_clickItem: function() {
					var _self = this;
					this.$areaListWrap.off('click').on('click', function(e) {
						if(e.target.tagName.toLowerCase() == 'li') {
							var code = $(e.target).attr('data-code');
							_self.isTopLevel = false;
							_self._selectItem(code);
						}
					});
				},
				_backEvent: function() {
					var _self = this;
					$('.J_address_back').off('click').on('click', function(e) {
						e.preventDefault();
						if(_self.isTopLevel) {
							_self.close();
						}
						var data = _self.addrData;
						if($(this).attr('data-pre-code') !== null) {
							var code = $(this).attr('data-pre-code');
							var retObj = _self.dataFilter(code, data);
							_self.render(retObj.data);
							$(this).removeAttr('data-pre-code');
						} else {
							_self.isTopLevel = true;
							_self.render(_self.addrData);
						}
					})
				},
				_selectItem: function(code) {
					var _self = this;
					var data = _self.addrData;
					if(code !== '0') {
						if(data) {
							var retObj = _self.dataFilter(code, data);
							_self.isTopLevel = false;
							if(code[3] == '0') {
								$('.J_address_back').attr('data-pre-code', code);
							}
							if(_self.settings.select !== null && typeof(_self.settings.select) == 'function') {
								_self.settings.select({
									areaCode: retObj.code,
									areaText: retObj.text
								});
							}
							if(retObj) {
								if(retObj.data) {
									_self.render(retObj.data);
								} else {
									_self.close();
									if(_self.settings.success !== null && typeof(_self.settings.success) == 'function') {
										_self.settings.success({
											areaCode: _self.parseCode(code),
											areaText: retObj.text
										});
									}
								}
							}
						}
					} else {
						_self.isTopLevel = true;
						_self.render(_self.addrData);
					}
				},
				_listenHash: function() {
					var _self = this;
					var data = _self.addrData;
					$(window).on('hashchange', function(e) {
						var hash = window.location.hash,
							code = window.location.hash.split('address:')[1];
						if(_self.flag) {
							if(window.location.hash == '') {
								_self.close();
							}
						}
					})
				},
				back: function(code) {
					if(_self.isTopLevel) {
						_self.close();
					}
					var data = _self.addrData;
					if($(this).attr('data-pre-code') !== null) {
						var code = $(this).attr('data-pre-code');
						var retObj = _self.dataFilter(code, data);
						_self.render(retObj.data);
						$(this).removeAttr('data-pre-code');
					} else {
						_self.isTopLevel = true;
						_self.render(_self.addrData);
					}
				},
				open: function() {
					this.flag = true;
					this._buildLayer();
					this._clickItem();
					$(this.settings.mainWrap).addClass('hide');
					this.$layer.removeClass('hide');
				},
				close: function() {
					this.flag = false;
					$(this.settings.mainWrap).removeClass('hide');
					this.$layer.addClass('hide');
				},
				_initEvent: function() {
					this._openLayerEvent();
				},
				init: function() {
					this._initEvent();
				}
			};
			return MmdAddress;
		})();
		$.fn.mmdAddress = function(options) {
			return this.each(function() {
				var $this = $(this),
					instance = $.fn.mmdAddress.lookup[$this.data('mmdAddress')];
				if(!instance) {
					$.fn.mmdAddress.lookup[++$.fn.mmdAddress.lookup.i] = new MmdAddress(this, options);
					$this.data('mmdAddress', $.fn.mmdAddress.lookup.i);
					instance = $.fn.mmdAddress.lookup[$this.data('mmdAddress')];
				}
				if(typeof options === 'string') return instance[options]();
			})
		};
		$.fn.mmdAddress.lookup = {
			i: 0
		};
		$.fn.mmdAddress.defaults = {
			style: 1,
			mainWrap: '#mainWrap',
			initAddress: '',
			hash: true,
			before: null,
			select: null,
			success: null
		};
	})(Zepto);
})
define('mmd.cart.index_v2', function(require, exports, module) {
	var $ = require('zepto'),
		cookie = require('cookie'),
		mError = require('module.error'),
		mFormatJson = require('formatJson'),
		URL = require('url'),
		cartCommon = require('cart.commonv2').init($);
	require('mmd.address');
	require('zepto.mpopup.v2');
	var fsId = URL.getUrlParam('fsid', location.href);
	fsId = fsId ? fsId : 0;
	mError.setMpopup($.mpopup);
	var numEditState = 0;
	var eventType = "click";
	var touchendType = "touchend";
	var domRenderCart = "#renderCartContent";
	var domCartWrap = "#list";
	var scrollTop = 0;

	function initEvent() {
		$("#editAll").on(touchendType, function() {
			var $this = $(this),
				$cartListBox = $(".cart_list_box"),
				$cartInvalidBox = $(".cart_invalid_box"),
				$fixBar = $(".fix_bar"),
				editSate = $this.attr("edit-state"),
				$edit_single = $(".edit_single");
			if(editSate == 1) {
				numEditState = 1;
				$this.html("完成");
				$this.attr("edit-state", 2);
				$cartListBox.addClass('cart_edit_box');
				$cartInvalidBox.removeClass('cart_edit_box');
				$fixBar.addClass("cart_all_edit");
				$edit_single.hide();
			} else if(editSate == 2) {
				$this.html("编辑全部");
				$this.attr("edit-state", 1);
				$cartListBox.removeClass('cart_edit_box');
				$fixBar.removeClass("cart_all_edit");
				$edit_single.show();
				$edit_single.html("编辑");
				$edit_single.attr("edit-state", 1);
				$edit_single.parents('.cart_list_box').removeClass('cart_edit_box');
			} else {
				window.location.href = commonDefine.method.updateUrl(window.location.href);
			}
		});
		$(domRenderCart).on("touchend", '.edit_single', function(e) {
			e.preventDefault();
			var $this = $(this),
				editSate = $this.attr("edit-state"),
				$cartListBox = $(".cart_list_box"),
				$cartInvalidBox = $(".cart_invalid_box"),
				$fixBar = $(".fix_bar"),
				$editAll = $("#editAll");
			if(editSate == 1) {
				numEditState = 2;
				$this.html("完成");
				$this.attr("edit-state", 2);
				$this.parents('.cart_list_box').addClass('cart_edit_box');
				var allEditFlag = 1;
				$(".edit_single").each(function() {
					if($(this).attr("edit-state") == 1) {
						allEditFlag = 0;
						return false;
					}
				});
				if(allEditFlag == 1) {
					$editAll.html("完成");
					$editAll.attr("edit-state", 2);
					$cartListBox.addClass('cart_edit_box');
					$cartInvalidBox.removeClass('cart_edit_box');
					$fixBar.addClass("cart_all_edit");
				}
			} else if(editSate == 2) {
				$this.html("编辑");
				$this.attr("edit-state", 1);
				$this.parents('.cart_list_box').removeClass('cart_edit_box');
				var allDoneFlag = 1;
				$(".edit_single").each(function() {
					if($(this).attr("edit-state") == 2) {
						allDoneFlag = 0;
						return false;
					}
				});
				if(allDoneFlag == 1) {
					$editAll.html("编辑全部");
					$editAll.attr("edit-state", 1);
					$cartListBox.removeClass('cart_edit_box');
					$fixBar.removeClass("cart_all_edit");
				}
			}
		});
		$('#area').mmdAddress({
			success: function(data) {
				cookie.del('addr_code', '', '.w.midea.com');
				cookie.del('addr_text', '', '.w.midea.com');
				cookie.del('addr_code', '', 'w.midea.com');
				cookie.del('addr_text', '', 'w.midea.com');
				cookie.del('addr_code', '', '.midea.com');
				cookie.del('addr_text', '', '.midea.com');
				cookie.setC('addr_code', data.areaCode, 60 * 24 * 30, '/', '.midea.com');
				if(typeof(data.areaText) != "undefined") {
					var arrText = (data.areaText).split(",");
					$("#addrText").html(arrText[1] + arrText[2]);
					window.location.href = commonDefine.method.updateUrl(window.location.href);
				}
			}
		});
		$(document).on("touchend", "#totalCheck", function() {
			if(typeof(window.totalCheck) != 'undefined' && window.totalCheck > 0) {
				if(typeof(window.nIsSumOverflowFlag) != 'undefined' && (window.nIsSumOverflowFlag == 1)) {
					commonDefine.method.cartPop('checkConfirm');
				} else {
					var domSkulistVal = $('#skuList').val();
					if(domSkulistVal) {
						$('#toOrder').submit();
					} else {
						commonDefine.method.cartPop('networkFail');
					}
				}
			}
		});
		$(document).on("click", ".js_pop_reload", function() {
			window.location.href = commonDefine.method.updateUrl(window.location.href);
		});
		if(typeof(window.strModifySkuIds) != 'undefined' && window.strModifySkuIds != '') {
			var skuArr = window.strModifySkuIds.split(",");
			for(var i = 0, l = skuArr.length; i < l; i++) {
				var objNum = new numObj();
				objNum.init(skuArr[i], 'sku');
			}
		}
		if(typeof(window.strModifyActIds) != 'undefined' && window.strModifyActIds != '') {
			var skuArr = window.strModifyActIds.split(",");
			for(var i = 0, l = skuArr.length; i < l; i++) {
				var objNum = new numObj();
				objNum.init(skuArr[i], 'act');
			}
		}
		initDelete();
		initChoose();
		initAct();
		commonDefine.method.operateAllInvalidState();
	}

	function initDelete() {
		var objDelete = new deleteObj();
		objDelete.init();
	}

	function initChoose() {
		var objChoose = new chooseObj();
		objChoose.init();
	}

	function initAct() {
		var objAct = new actObj();
		objAct.init();
	}

	function updateData($thisShop, data, type) {
		if(typeof(data.errcode) != 'undefined' && data.errcode == 0) {
			var renderData = data.data;
			if(typeof(renderData.totalNum) != 'undefined' && renderData.totalNum > 0) {
				var nRenderType = data.data.nRenderType;
				if(typeof(nRenderType) != 'undefined' && nRenderType == 2) {
					if(typeof(renderData.lModifyShop) != 'undefined' && renderData.lModifyShop != 0) {
						$thisShop.html(data.data.cartShopListTpl);
						if(typeof(type) != "undefined" && type == 1) {
							var $edit_single = $thisShop.find(".edit_single");
							if(numEditState == 1) {
								$edit_single.hide();
							} else if(numEditState == 2) {
								$edit_single.attr("edit-state", 2);
								$edit_single.html('完成');
							}
						}
						if(typeof(renderData.nIsModifyShopInvalidFlag) != 'undefined' && renderData.nIsModifyShopInvalidFlag == true) {
							$thisShop.remove();
						}
					} else {
						$thisShop.remove();
					}
					$(".js_fix_bar").html(data.data.cartFixBarTpl);
					commonDefine.method.operateEditState();
				} else {
					var $renderSArea = $("#renderCartContent");
					$renderSArea.html(data.data.cartShopListTpl);
					$renderSArea.append(data.data.cartInvalidListTpl);
					$renderSArea.append(data.data.cartFixBarTpl);
					var $editAll = $("#editAll");
					$editAll.html("编辑全部");
					$editAll.attr("edit-state", 1);
				}
			} else {
				location.reload();
			}
			window.strModifySkuIds = renderData.strModifySkuIds;
			window.strModifyActIds = renderData.strModifyActIds;
			window.vecCartActList = renderData.vecCartActList;
			window.frontItemList = renderData.frontItemList;
			window.totalCheck = renderData.totalCheck;
			window.nIsSumOverflowFlag = renderData.nIsSumOverflowFlag;
			window.nIsAllInvalid = renderData.nIsAllInvalid;
			$('#skuList').val(JSON.stringify(renderData.vecSubmitProductInfo));
			$('#actList').val(JSON.stringify(renderData.vecSubmitActInfo));
			$('#shopList').val(JSON.stringify(renderData.vecSubmitShopInfo));
			var strModifySkuIds = data.data.strModifySkuIds;
			var strModifyActIds = data.data.strModifyActIds;
			if(typeof(strModifySkuIds) != 'undefined' && strModifySkuIds != '') {
				var skuArr = strModifySkuIds.split(",");
				for(var i = 0, l = skuArr.length; i < l; i++) {
					var objNum = new numObj();
					objNum.init(skuArr[i], 'sku');
				}
			}
			if(typeof(strModifyActIds) != 'undefined' && strModifyActIds != '') {
				var skuArr = strModifyActIds.split(",");
				for(var i = 0, l = skuArr.length; i < l; i++) {
					var objNum = new numObj();
					objNum.init(skuArr[i], 'act');
				}
			}
			commonDefine.method.operateAllInvalidState();
		} else if(data.errcode == 0x21531001) {
			commonDefine.method.cartPop('commonFail', data.errmsg);
		} else if(data.errcode == 0x21541001) {
			commonDefine.method.cartPop('commonFail', data.errmsg);
		} else if(data.errcode == 0x21531002) {
			commonDefine.method.cartPop('commonFail', data.errmsg);
		} else if(data.errcode == 0x21531003) {
			commonDefine.method.cartPop('dataUpdate');
		} else if(data.errcode == 0x20BE1007) {
			commonDefine.method.cartPop('collectNoSpace', data.errmsg);
		} else if(data.errcode == 0x20BE1008) {
			commonDefine.method.cartPop('commonFail', data.errmsg);
		} else if(data.errcode == 0x20BE1009) {
			commonDefine.method.cartPop('commonFail', data.errmsg);
		} else if(data.errcode == 0x21531006 || data.errcode == 0x21531005) {
			commonDefine.method.cartPop('editNumFail', data.errmsg);
		} else if(data.errcode == 0x21531015) {
			commonDefine.method.cartPop("totast_hide", data.errmsg);
		} else {
			commonDefine.method.cartPop("commonError", data.errmsg);
		}
	}
	var commonDefine = {};
	commonDefine.method = {
		commonPop: function(arr, type) {
			if(type == 2) {
				$.mpopup({
					type: 'confirmV2',
					icoType: '',
					content: '<div style="text-align: center">' + arr[0] + '</div>',
					destroyAfterClose: true,
					buttons: [{
						tpl: '<a class="' + arr[2] + ' mod_popup_btn" data-mpopup-close href="javascript:void(0)">' + arr[1] + '</a>'
					}, {
						tpl: '<a class="' + arr[4] + ' mod_popup_btn" data-mpopup-close href="javascript:void(0)">' + arr[3] + '</a>'
					}]
				}).show();
			} else if(type == 3) {
				$.mpopup({
					type: 'confirmV2',
					icoType: '',
					content: '<div style="text-align: center">' + arr[0] + '</div>',
					destroyAfterClose: true,
					buttons: [{
						tpl: '<a  class="mod_popup_btn " href="javascript:void(0)" data-mpopup-close>' + arr[1] + '</a>'
					}]
				}).show();
			} else if(type == 4) {
				$.mpopup({
					type: 'confirmV2',
					icoType: '',
					content: '<div style="text-align: center">' + arr[0] + '</div>',
					destroyAfterClose: true,
					buttons: [{
						tpl: '<a  class="mod_popup_btn ' + arr[2] + '" href="javascript:void(0)">' + arr[1] + '</a>'
					}]
				}).show();
			} else {
				$.mpopup({
					type: 'info',
					icoType: '',
					contentTxt: arr[0],
					destroyAfterClose: true,
					buttons: '',
					autoClose: 2000
				}).show();
			}
		},
		commonPopV2: function(obj) {
			var opt = {
				type: obj.popType || 'info',
				icoType: '',
				content: '<div style="text-align: center">' + (obj.title || '') + '</div>',
				destroyAfterClose: true,
				buttons: [{
					tpl: '<a class="' + (obj.leftBtnClass || '') + ' mod_popup_btn" data-mpopup-close href="javascript:void(0)">' + obj.leftBtnTxt || '取消' + '</a>'
				}],
				autoClose: obj.autoClose || false
			};
			if(obj.rightBtnTxt != "undefined" && obj.rightBtnTxt) {
				opt.buttons.push({
					tpl: '<a class="' + (obj.rightBtnClass || '') + ' mod_popup_btn" data-mpopup-close href="javascript:void(0)">' + obj.rightBtnTxt || '确定' + '</a>'
				});
			}
			$.mpopup(opt).show();
		},
		cartPop: function(type, errmsg) {
			var arrPop = [],
				popType = 2;
			var failMsg = errmsg || '服务异常，建议刷新';
			switch(type) {
				case 'selectMore':
					arrPop = ['请至少选择一款商品'];
					popType = 1;
					break;
				case 'dataUpdate':
					arrPop = ['数据有更新，刷新查看最新数据'];
					window.setTimeout(function() {
						window.location.href = commonDefine.method.updateUrl(window.location.href);
					}, 2000);
					popType = 1;
					break;
				case 'totast_hide':
					arrPop = [failMsg];
					popType = 1;
					break;
				case 'actFail':
					arrPop = [failMsg];
					window.setTimeout(function() {
						window.location.href = commonDefine.method.updateUrl(window.location.href);
					}, 2000);
					popType = 1;
					break;
				case 'editNumFail':
					arrPop = ['编辑数量失败！' + failMsg];
					window.setTimeout(function() {
						window.location.href = commonDefine.method.updateUrl(window.location.href);
					}, 2000);
					popType = 1;
					break;
				case 'delConfirm':
					arrPop = ['删除后商品将不在购物车展示，您可以选择移入收藏夹', '取消', '', '确认删除', 'js_confirm_detele'];
					break;
				case 'delGiftConfirm':
					arrPop = ['删除后商品将不在购物车展示', '取消', '', '确认删除', 'js_confirm_detele'];
					break;
				case 'collectConfirm':
					arrPop = ['移入收藏夹后将不在购物车展示', '取消', '', '移入收藏夹', 'js_confirm_collect'];
					break;
				case 'collectNoSpace':
					arrPop = [failMsg, '清理收藏夹', 'js_to_collect', '取消', ''];
					break;
				case 'clearInvalidConfirm':
					arrPop = ['确认删除失效商品', '取消', '', '确认删除', 'js_confirm_clear_invalid'];
					break;
				case 'checkConfirm':
					arrPop = ['累计金额不能超过100万', '确认'];
					popType = 3;
					break;
				case 'commonFail':
					arrPop = [failMsg, '取消', '', '确认刷新', 'js_pop_reload'];
					break;
				case 'networkFail':
					arrPop = ['请刷新重试', '取消', '', '确认刷新', 'js_pop_reload'];
					break;
				case 'commonError':
					arrPop = [failMsg, '确认', 'js_pop_reload'];
					popType = 4;
					break;
				default:
					arrPop = ['请刷新重试'];
					window.setTimeout(function() {
						window.location.href = commonDefine.method.updateUrl(window.location.href);
					}, 2000);
					popType = 1;
			}
			this.commonPop(arrPop, popType);
		},
		updateUrl: function(url) {
			var key = (key || 't') + '=';
			var reg = new RegExp(key + '\\d+');
			var timestamp = +new Date();
			if(url.indexOf(key) > -1) {
				return url.replace(reg, key + timestamp);
			} else {
				if(url.indexOf('\?') > -1) {
					var urlArr = url.split('\?');
					if(urlArr[1]) {
						return urlArr[0] + '?' + key + timestamp + '&' + urlArr[1];
					} else {
						return urlArr[0] + '?' + key + timestamp;
					}
				} else {
					if(url.indexOf('#') > -1) {
						return url.split('#')[0] + '?' + key + timestamp + location.hash;
					} else {
						return url + '?' + key + timestamp;
					}
				}
			}
		},
		operateLoading: function(type) {
			var $loader_wrap = $(".loader_wrap");
			if(type == 'show') {
				$loader_wrap.addClass("show");
			} else {
				$loader_wrap.removeClass("show");
			}
		},
		uniqueArr: function(arr) {
			var ret = [];
			var hash = {};
			for(var i = 0; i < arr.length; i++) {
				var item = arr[i];
				var key = typeof(item) + item;
				if(hash[key] !== 1) {
					ret.push(item);
					hash[key] = 1
				}
			}
			return ret;
		},
		operateEditState: function() {
			var $fix_bar = $(".fix_bar"),
				$edit_single = $(".cart_edit_box").find(".edit_single");
			$edit_single.html("完成");
			$edit_single.attr("edit-state", '2');
			if($fix_bar.hasClass("cart_all_edit")) {
				$(".edit_single").hide();
			}
		},
		operateAllInvalidState: function() {
			if(window.nIsAllInvalid) {
				$(".fix_bar ").removeClass("cart_all_edit");
				var $editAll = $("#editAll");
				$editAll.html("编辑全部");
				$editAll.attr("edit-state", 1);
				$editAll.unbind();
				$("#selectAllBox").unbind();
			}
		}
	};
	var numObj = function() {
		this.nMinNum = 1;
		this.nNewNum = 1;
		this.editType = '';
	};
	numObj.prototype = {
		init: function(nSkuid, type) {
			var domEditNum = $('#divEditNum_' + nSkuid),
				frontItemList = window.frontItemList;
			this.nSkuid = nSkuid;
			this.editType = type;
			if(type == 'sku') {
				this.nQuotaNum = frontItemList[nSkuid].nQuota ? frontItemList[nSkuid].nQuota : 200;
				this.nCalStock = frontItemList[nSkuid].nCalStock ? frontItemList[nSkuid].nCalStock : 0;
			} else {
				this.nQuotaNum = window.vecCartActList[nSkuid].nActQuota ? window.vecCartActList[nSkuid].nActQuota : 200;
				this.nCalStock = window.vecCartActList[nSkuid].nCalStock ? window.vecCartActList[nSkuid].nCalStock : 0;
			}
			this.skuid = nSkuid;
			this.nMaxNum = this.nCalStock == 0 ? Math.min(this.nQuotaNum, 200) : Math.min(this.nQuotaNum, 200, this.nCalStock);
			this.oNumTxt = domEditNum.find('.num'), this.oEditDiv = domEditNum, this.oCartProductNum = domEditNum.parents(".item_core").find(".cart_product_num");
			var meObj = this;
			var canEdit = true;
			if(type == 'sku') {
				if(frontItemList[nSkuid].nDisSkuState == 8 || frontItemList[nSkuid].nDisSkuState == 16) {
					canEdit = false;
				}
			}
			if(canEdit) {
				domEditNum.click(function(e) {
					var oTarget = e.target;
					switch(oTarget.className) {
						case 'minus':
							meObj.delNum(meObj);
							break;
						case 'plus':
							meObj.addNum(meObj);
							break;
					}
				});
			}
			meObj.oNumTxt.focus(function() {
				meObj.focusNumTxt(meObj);
			}).blur(function() {
				meObj.blurNumTxt(meObj);
			});
		},
		focusNumTxt: function(meObj) {
			meObj.oNumTxt.attr('cacheNum', meObj.oNumTxt.val());
		},
		blurNumTxt: function(meObj) {
			meObj.nNewNum = meObj.oNumTxt.val() * 1;
			meObj.editNum(meObj);
		},
		delNum: function(meObj) {
			meObj.nNewNum = meObj.oNumTxt.val() * 1 - 1;
			if(meObj.nNewNum >= meObj.nMinNum) {
				meObj.editNum(meObj);
			}
		},
		addNum: function(meObj) {
			meObj.nNewNum = meObj.oNumTxt.val() * 1 + 1;
			if(meObj.nNewNum <= meObj.nMaxNum) {
				meObj.editNum(meObj);
			} else {
				meObj.warn(meObj);
			}
		},
		editNum: function(meObj) {
			var flagCartEdit = cookie.get('flagCartEdit') || 1;
			if(flagCartEdit == 1) {
				var $warn = meObj.oEditDiv.parents(".cart_item_box").find(".cart_product_stock");
				$warn.html('');
				if(meObj.nNewNum <= meObj.nMaxNum && meObj.nNewNum >= meObj.nMinNum) {
					meObj.oNumTxt.val(meObj.nNewNum);
					meObj.oCartProductNum.html("x" + meObj.nNewNum);
					meObj.changeNumReq(meObj, meObj.nNewNum);
				} else {
					meObj.oNumTxt.val(meObj.nMaxNum);
					meObj.oCartProductNum.html("x" + meObj.nMaxNum);
					meObj.changeNumReq(meObj, meObj.nMaxNum);
					meObj.warn(meObj);
				}
			} else {
				console.log("点的太快了~");
			}
		},
		warn: function(meObj) {
			var $warn = meObj.oEditDiv.parents(".cart_item_box").find(".cart_product_stock");
			if(this.nCalStock == 0) {
				$warn.html("限购" + meObj.nMaxNum + "件");
			} else {
				if(this.nQuotaNum < this.nCalStock) {
					$warn.html("限购" + meObj.nMaxNum + "件");
				} else {
					$warn.html("库存仅剩" + meObj.nMaxNum + "件");
				}
			}
		},
		changeNumReq: function(meObj, changeNum) {
			var para = {};
			var submitData = {};
			var oldNum = 0;
			if(meObj.editType == 'act') {
				oldNum = window.vecCartActList[meObj.nSkuid]['nActNum'];
				submitData = {
					'act_id': window.vecCartActList[meObj.nSkuid]['lActivityId'],
					'act_type': window.vecCartActList[meObj.nSkuid]['nActivityType'],
					'shop_id': window.vecCartActList[meObj.nSkuid]['lDistributorId'],
					'num': changeNum
				}
			} else {
				oldNum = window.frontItemList[meObj.skuid]['nDisSkuNum'];
				submitData = {
					'sku_id': meObj.skuid,
					'num': changeNum
				}
			}
			if(oldNum != changeNum) {
				cookie.setC('flagCartEdit', 0, 60 * 24 * 7, '/', '.midea.com');
				para = {
					_curObj: meObj,
					_data: submitData,
					_success: meObj.changeNumSuccess,
					_error: meObj.changeNumFail
				};
				cartCommon.method.commonEditNum(para);
				commonDefine.method.operateLoading("show");
			}
		},
		changeNumSuccess: function(data, meObj) {
			cookie.setC('flagCartEdit', 1, 60 * 24 * 7, '/', '.midea.com');
			var $thisShop = meObj.oEditDiv.parents(".cart_list_box");
			commonDefine.method.operateLoading("hide");
			updateData($thisShop, data, 1);
		},
		changeNumFail: function(data) {
			commonDefine.method.operateLoading("hide");
			cookie.setC('flagCartEdit', 1, 60 * 24 * 7, '/', '.midea.com');
			commonDefine.method.cartPop("networkFail");
		}
	};
	var chooseObj = function() {
		this.handleDom = '';
		this.arrChooseId = '';
		this.checkStatus = '';
		this.checkType = 1;
		this.skuId = 0;
		this.shopId = 0;
		this.actId = 0;
		this.actType = 0;
	};
	chooseObj.prototype = {
		init: function() {
			var meObj = this;
			$(domRenderCart).on(eventType, ".js_item_select_box", function(e) {
				commonDefine.method.operateLoading("show");
				meObj.checkType = 1;
				if($(this).attr('data-type') == 'act') {
					meObj.chooseAct(meObj, this);
				} else {
					meObj.chooseSingle(meObj, this);
				}
			});
			$(domRenderCart).on(eventType, ".js_shop_select_box", function(e) {
				commonDefine.method.operateLoading("show");
				meObj.checkType = 2;
				meObj.chooseMultiple(meObj, this);
			});
			$(domRenderCart).on(eventType, "#selectAllBox", function(e) {
				commonDefine.method.operateLoading("show");
				meObj.checkType = 3;
				meObj.chooseAll(meObj, this);
			});
		},
		chooseAct: function(meObj, dom) {
			var flagCartChoose = cookie.get('flagCartChoose') || 1;
			if(flagCartChoose == 1) {
				meObj.handleDom = $(dom).parents('.cart_item_content').find(".js_item_select");
				meObj.actId = meObj.handleDom.attr('data-id');
				meObj.checkStatus = meObj.handleDom.data("select");
				meObj.changeActCheckedStatus(meObj);
			}
		},
		chooseSingle: function(meObj, dom) {
			var flagCartChoose = cookie.get('flagCartChoose') || 1;
			if(flagCartChoose == 1) {
				meObj.handleDom = $(dom).parents('.cart_item_content').find(".js_item_select");
				meObj.arrChooseId = [];
				meObj.arrChooseId.push(meObj.handleDom.data("id"));
				meObj.checkStatus = meObj.handleDom.data("select");
				meObj.changeCheckedStatus(meObj);
			}
		},
		chooseMultiple: function(meObj, dom) {
			var flagCartChoose = cookie.get('flagCartChoose') || 1;
			if(flagCartChoose == 1) {
				meObj.handleDom = $(dom).parents('.cart_left').find(".js_shop_select");
				meObj.arrChooseId = [$(dom).attr("data-id")];
				meObj.checkStatus = meObj.handleDom.data("select");
				var isCheck = (meObj.checkStatus == 1) ? 0 : 1;
				var para = {
					_curObj: meObj,
					_data: {
						'is_check': isCheck,
						'distributor_id': $(dom).attr("data-id")
					},
					_success: meObj.changeCheckedStatusSuccess,
					_error: meObj.changeCheckedStatusFail
				};
				cartCommon.method.commonChangeAllCheckStatus(para);
				cookie.setC('flagCartChoose', 0, 60 * 24 * 7, '/', '.midea.com');
			}
		},
		chooseAll: function(meObj, dom) {
			var flagCartChoose = cookie.get('flagCartChoose') || 1;
			if(flagCartChoose == 1) {
				meObj.handleDom = $(dom).find("#selectAll");
				meObj.checkStatus = meObj.handleDom.data("select");
				var isCheck = (meObj.checkStatus == 1) ? 0 : 1;
				var para = {
					_curObj: meObj,
					_data: {
						'is_check': isCheck
					},
					_success: meObj.changeAllCheckedStatusSuccess,
					_error: meObj.changeCheckedStatusFail
				};
				cartCommon.method.commonChangeAllCheckStatus(para);
				cookie.setC('flagCartChoose', 0, 60 * 24 * 7, '/', '.midea.com');
			}
		},
		changeActCheckedStatus: function(meObj) {
			var flagCartChoose = cookie.get('flagCartChoose') || 1;
			if(flagCartChoose == 1) {
				cookie.setC('flagCartChoose', 0, 60 * 24 * 7, '/', '.midea.com');
				if(meObj.actId) {
					var _actId = window.vecCartActList[meObj.actId].lActivityId;
					var _actType = window.vecCartActList[meObj.actId].nActivityType;
					var _shopId = window.vecCartActList[meObj.actId].lDistributorId;
					var isCheck = (meObj.checkStatus == 1) ? 0 : 1;
					var para = {
						_curObj: meObj,
						_data: {
							'act_id': _actId,
							'act_type': _actType,
							'shop_id': _shopId,
							'is_check': isCheck
						},
						_check: meObj.changeCheckedStatusCheck,
						_success: meObj.changeCheckedStatusSuccess,
						_error: meObj.changeCheckedStatusFail
					};
					cartCommon.method.commonChangeCheckStatus(para);
				}
			}
		},
		changeCheckedStatus: function(meObj) {
			var isCheck = (meObj.checkStatus == 1) ? 0 : 1;
			var para = {
				_curObj: meObj,
				_data: {
					'sku_id': meObj.arrChooseId[0],
					'is_check': isCheck
				},
				_success: meObj.changeCheckedStatusSuccess,
				_error: meObj.changeCheckedStatusFail
			};
			cartCommon.method.commonChangeCheckStatus(para);
			cookie.setC('flagCartChoose', 0, 60 * 24 * 7, '/', '.midea.com');
		},
		changeAllCheckedStatusSuccess: function(data, meObj) {
			commonDefine.method.operateLoading("hide");
			var $thisShop = $("#renderCartContent");
			cookie.setC('flagCartChoose', 1, 60 * 24 * 7, '/', '.midea.com');
			updateData($thisShop, data);
		},
		changeCheckedStatusSuccess: function(data, meObj) {
			var $thisShop = meObj.handleDom.parents(".cart_list_box");
			commonDefine.method.operateLoading("hide");
			cookie.setC('flagCartChoose', 1, 60 * 24 * 7, '/', '.midea.com');
			updateData($thisShop, data);
		},
		changeCheckedStatusFail: function() {
			commonDefine.method.operateLoading("hide");
			commonDefine.method.cartPop("networkFail");
			cookie.setC('flagCartChoose', 1, 60 * 24 * 7, '/', '.midea.com');
		}
	};
	var actObj = function() {
		this.handleDom = '';
		this.checkType = 1;
		this.actSkuId = 0;
		this.giftShopId = 0;
		this.giftActId = 0;
		this.actType = 0;
	};
	actObj.prototype = {
		init: function() {
			var meObj = this;
			$(".mask").on("click", function(e) {
				$(".fix_wrap").removeClass("show");
				meObj.operateActiveBox(2);
			});
			$(domRenderCart).on(eventType, ".js_select_active", function(e) {
				e.preventDefault();
				meObj.operateActiveBox(1);
				$(".js_active_box").html('');
				meObj.actSkuId = 0;
				meObj.actSkuId = $(this).attr("data-sku-id");
				commonDefine.method.operateLoading("show");
				meObj.getSkuActiveList(meObj, this);
			});
			$(domCartWrap).on(eventType, ".js_select_act_item", function() {
				var $this = $(this);
				$this.parents(".active_list").find(".js_select_act_item").removeClass("selected");
				$this.addClass("selected");
			});
			$(domCartWrap).on(eventType, ".change_btn", function(e) {
				e.preventDefault();
				var $this = $(this);
				meObj.actType = 0;
				meObj.actType = $this.attr("data-act-type");
				meObj.giftShopId = 0;
				meObj.giftShopId = $this.parents(".cart_list_box").find(".js_shop_select_box").data("id");
				commonDefine.method.operateLoading("show");
				$(".js_product_box").html("");
				meObj.getGiftList(meObj, this);
			});
			$(domCartWrap).on(eventType, ".js_confirm_act", function(e) {
				e.preventDefault();
				meObj.operateActiveBox(2);
				commonDefine.method.operateLoading("show");
				$(".fix_wrap").removeClass("show").removeClass("active_state");
				meObj.updateAct(meObj, this);
			});
			$(domCartWrap).on(eventType, ".js_exchange_gift", function() {
				var $this = $(this);
				var $Brothers = $this.parents(".product_box").find(".js_exchange_gift")
				var actType = meObj.actType;
				console.log("活动类型：" + actType);
				if(actType == 5) {
					$Brothers.removeClass("selected");
					$this.addClass("selected");
				} else {
					if($this.hasClass('selected')) {
						$this.removeClass("selected");
					} else {
						$Brothers.removeClass("selected");
						$this.addClass("selected");
					}
				}
			});
			$(domCartWrap).on(eventType, ".js_exchange_confirm", function(e) {
				e.preventDefault();
				meObj.operateActiveBox(2);
				commonDefine.method.operateLoading("show");
				$(".fix_wrap").removeClass("show").removeClass("active_state");
				meObj.updateGift(meObj, this);
			});
		},
		operateActiveBox: function(type) {
			var $body = $("body");
			console.log("高度：" + top);
			if(type == 1) {
				scrollTop = $body.scrollTop();
				$body.addClass("over_flow_hide");
			} else {
				$body.removeClass("over_flow_hide");
				$body.scrollTop(scrollTop);
				scrollTop = 0;
			}
		},
		updateAct: function(meObj, dom) {
			var oldActId = $(dom).data("old-act-id"),
				skuId = meObj.actSkuId,
				newActId = $(".active_list .selected").data("act-id");
			console.log("旧id:" + oldActId + " 新id:" + newActId);
			if(newActId == oldActId) {
				commonDefine.method.operateLoading("hide");
				$(".fix_wrap").removeClass("show");
			} else {
				if(skuId != 0 && typeof(newActId) != "undefined") {
					var para = {
						_curObj: meObj,
						_data: {
							'act_id': newActId,
							sku_id: skuId
						},
						_success: meObj.updateActSuccess,
						_error: meObj.updateActFail
					};
					cartCommon.method.commonQueryAct(para);
				} else {
					commonDefine.method.cartPop("dataUpdate");
				}
			}
		},
		updateGift: function(meObj, dom) {
			var actType = meObj.actType,
				actId = 0,
				para = {};
			var $selected = $(".product_box .selected");
			console.dir($selected);
			if($selected.length == 0) {
				var hasGiftGood = $(dom).attr("data-has-gift");
				if((typeof(actType) != "undefined" && actType == 6) && hasGiftGood == 1) {
					actId = $(dom).attr("data-act-id");
					var distributorId = $(dom).attr("data-distributor-id");
					para = {
						_curObj: meObj,
						_data: {},
						_success: meObj.updateGiftSuccess,
						_error: meObj.updateGiftFail
					};
					para._data = {
						'distributor_id': distributorId,
						'act_id': actId
					};
					cartCommon.method.commonDeleteGift(para);
				} else {
					commonDefine.method.operateLoading("hide");
					$(".fix_wrap").removeClass("show");
				}
			} else {
				var skuId = $selected.attr("data-sku-id"),
					stepId = $selected.data("step-id"),
					isCheck = $selected.data("check"),
					shopId = meObj.giftShopId;
				actId = $selected.data("act-id");
				if(typeof(isCheck) != "undefined" && isCheck == 1) {
					commonDefine.method.operateLoading("hide");
					$(".fix_wrap").removeClass("show");
				} else {
					para = {
						_curObj: meObj,
						_data: {
							'act_id': actId,
							item_id: skuId,
							'step_id': stepId,
							'distributor_id': shopId
						},
						_success: meObj.updateGiftSuccess,
						_error: meObj.updateGiftFail
					};
					cartCommon.method.commonUpdateGift(para);
				}
			}
		},
		getGiftList: function(meObj, dom) {
			var actId = $(dom).data("act-id"),
				stepId = $(dom).data("step-id");
			meObj.giftActId = actId;
			var para = {
				_curObj: meObj,
				_data: {
					'act_id': actId,
					step_id: stepId,
					'fsid': fsId
				},
				_success: meObj.getGiftListSuccess,
				_error: meObj.getGiftListFail
			};
			cartCommon.method.commonQueryGift(para);
		},
		getSkuActiveList: function(meObj, dom) {
			var skuId = meObj.actSkuId,
				actId = $(dom).attr("data-act-id");
			if(skuId != 0) {
				var para = {
					_curObj: meObj,
					_data: {
						'sku_id': skuId,
						'act_id': actId
					},
					_success: meObj.getSkuActiveListSuccess,
					_error: meObj.getSkuActiveListFail
				};
				cartCommon.method.commonGetActiveList(para);
			} else {
				commonDefine.method.cartPop("dataUpdate");
			}
		},
		getSkuActiveListSuccess: function(data, meObj) {
			commonDefine.method.operateLoading("hide");
			if(data.errcode == 0) {
				if(data.data.actList != null) {
					$(".fix_wrap").addClass("active_state ").addClass("show");
					$(".active_box").html(mFormatJson.render($('#activeListTpl').html(), {
						data: data
					}));
				} else {
					commonDefine.method.cartPop('actFail', '暂无促销活动，请稍后再试');
				}
			} else if(data.errcode == 0x21531016) {
				commonDefine.method.cartPop('actFail', '暂无促销活动，请稍后再试');
			} else {
				commonDefine.method.cartPop("dataUpdate");
			}
		},
		getSkuActiveListFail: function() {
			commonDefine.method.operateLoading("hide");
			commonDefine.method.cartPop("networkFail");
		},
		getGiftListSuccess: function(data, meObj) {
			commonDefine.method.operateLoading("hide");
			if(data.errcode == 0) {
				meObj.operateActiveBox(1);
				var renderData = data.data;
				var vecMapActInfoList = window.vecCartActList;
				renderData.checkedNum = 0;
				renderData.warnTip = '';
				if(renderData.giftList != null) {
					$(".fix_wrap").addClass("show").removeClass("active_state");
					for(var i = 0; i < renderData.giftList.length; i++) {
						var giftItem = renderData.giftList[i];
						if(giftItem.strSpec) {
							var jsonSpec = $.parseJSON(giftItem.strSpec);
							if(jsonSpec.colorName && jsonSpec.specName) {
								if(jsonSpec.colorName && jsonSpec.specName) {
									giftItem.strSpec = jsonSpec.colorName + '/' + jsonSpec.specName;
								} else {
									if(jsonSpec.colorName) {
										giftItem.strSpec = jsonSpec.colorName;
									}
									if(jsonSpec.specName) {
										giftItem.strSpec = jsonSpec.specName;
									}
								}
							} else {
								giftItem.strSpec = '';
							}
						} else {
							giftItem.strSpec = '';
						}
						var act_id = giftItem.lActId;
						var act_type = giftItem.nActType;
						if(vecMapActInfoList[act_id + '_' + act_type].lGiftStepId == giftItem.lStepId && vecMapActInfoList[act_id + '_' + act_type].lGiftSkuId == giftItem.lDisSkuId) {
							renderData.checkedNum = 1;
							console.dir(vecMapActInfoList[act_id + '_' + act_type]);
							console.dir(giftItem);
							giftItem.isChecked = 1;
						} else {
							giftItem.isChecked = 0;
						}
						if(!vecMapActInfoList[act_id + '_' + act_type].lStepId) {
							renderData.warnTip = '请先勾选主商品，达到门槛后即可选换赠品';
						}
					}
					$(".product_box").html(mFormatJson.render($('#giftListTpl').html(), {
						data: data.data
					}));
				} else {
					commonDefine.method.cartPop('actFail', '暂无换赠品，请稍后再试');
				}
			} else if(data.errcode == 0x21531016) {
				commonDefine.method.cartPop('actFail', '暂无换赠品，请稍后再试');
			} else {
				commonDefine.method.cartPop();
			}
		},
		getGiftListFail: function(data, meObj) {
			commonDefine.method.operateLoading("hide");
			commonDefine.method.cartPop("networkFail");
		},
		updateActSuccess: function(data, meObj) {
			commonDefine.method.operateLoading("hide");
			$(".fix_wrap").removeClass("show");
			var shopId = window.frontItemList[meObj.actSkuId]['lDistributorId'];
			if(typeof(shopId) != "undefined") {
				var $thisShop = $(".js_cart_shop_" + shopId);
				updateData($thisShop, data);
			} else {
				location.reload();
			}
		},
		updateActFail: function() {
			commonDefine.method.operateLoading("hide");
			commonDefine.method.cartPop("networkFail");
		},
		updateGiftSuccess: function(data, meObj) {
			commonDefine.method.operateLoading("hide");
			$(".fix_wrap").removeClass("show");
			var shopId = meObj.giftShopId;
			if(typeof(shopId) != "undefined") {
				var $thisShop = $(".js_cart_shop_" + shopId);
				updateData($thisShop, data);
			} else {
				location.reload();
			}
		},
		updateGiftFail: function() {
			commonDefine.method.operateLoading("hide");
			commonDefine.method.cartPop("networkFail");
		}
	};
	var deleteObj = function() {
		this.arrDeleteId = [];
		this.arrDeleteItemid = [];
		this.arrDeleteShopId = [];
		this.arrDeleteActInfo = [];
		this.handleDom = '';
		this.itemType = 0;
		this.giftActId = 0;
		this.handleType = '';
	};
	deleteObj.prototype = {
		init: function() {
			var meObj = this;
			$(domRenderCart).on(eventType, ".js_item_delete", function() {
				meObj.handleType = $(this).attr('data-type');
				meObj.deleteSingle(meObj, this);
			});
			$(domRenderCart).on(eventType, ".js_sum_delete", function() {
				meObj.handleType = $(this).attr('data-type');
				meObj.deleteMultiple(meObj);
			});
			$(document).on(touchendType, ".js_confirm_detele", function() {
				meObj.deleteConfirm(meObj);
			});
			$(domRenderCart).on(eventType, ".js_clear_invalid_product", function() {
				commonDefine.method.cartPop("clearInvalidConfirm");
			});
			$(document).on(touchendType, ".js_confirm_clear_invalid", function() {
				meObj.clearInvalidConfirm(meObj);
			});
		},
		deleteSingle: function(meObj, dom) {
			meObj.handleDom = $(dom);
			meObj.arrDeleteId = [];
			meObj.arrDeleteItemid = [];
			meObj.arrDeleteShopId = [];
			meObj.arrDeleteActInfo = [];
			meObj.itemType = 0;
			meObj.giftActId = 0;
			var tempSkuId = meObj.handleDom.attr('data-id'),
				tempItemid = meObj.handleDom.attr('data-itemid'),
				itemType = meObj.handleDom.data('item-type'),
				shopId = meObj.handleDom.data('shop-id');
			meObj.itemType = itemType;
			if(typeof(itemType) != "undefined" && itemType == 1) {
				var actId = meObj.handleDom.data('act-id');
				meObj.arrDeleteShopId.push(shopId);
				meObj.giftActId = actId;
				meObj.arrDeleteId.push(tempSkuId);
				meObj.arrDeleteItemid.push(tempItemid);
			} else {
				if(meObj.handleType == 'act') {
					var actId = meObj.handleDom.attr('data-act-id');
					var tempActArr = {
						'act_id': window.vecCartActList[actId]['lActivityId'],
						'act_type': window.vecCartActList[actId]['nActivityType']
					}
					meObj.arrDeleteActInfo.push(tempActArr);
					meObj.arrDeleteShopId.push(window.vecCartActList[actId].lDistributorId);
				} else {
					meObj.arrDeleteId.push(tempSkuId);
					meObj.arrDeleteItemid.push(tempItemid);
					meObj.arrDeleteShopId.push(window.frontItemList[tempSkuId].lDistributorId);
				}
			}
			if(meObj.arrDeleteId.length > 0 || meObj.arrDeleteActInfo.length > 0) {
				if(meObj.handleType == 'collect') {
					commonDefine.method.commonPopV2({
						'popType': 'confirmV2',
						'autoClose': false,
						'title': '移入收藏夹后将不在购物车展示',
						'leftBtnTxt': '取消',
						'leftBtnClass': '',
						'rightBtnTxt': '确认',
						'rightBtnClass': 'js_confirm_detele'
					});
				} else if(meObj.handleType == 'act') {
					commonDefine.method.commonPopV2({
						'popType': 'confirmV2',
						'autoClose': false,
						'title': '删除后商品将不在购物车展示',
						'leftBtnTxt': '取消',
						'leftBtnClass': '',
						'rightBtnTxt': '确认删除',
						'rightBtnClass': 'js_confirm_detele'
					});
				} else {
					if(meObj.itemType == 1) {
						commonDefine.method.cartPop('delGiftConfirm');
					} else {
						commonDefine.method.cartPop('delConfirm');
					}
				}
			} else {
				commonDefine.method.cartPop('selectMore');
			}
		},
		deleteMultiple: function(meObj) {
			meObj.arrDeleteId = [];
			meObj.arrDeleteItemid = [];
			meObj.arrDeleteShopId = [];
			meObj.arrDeleteActInfo = [];
			$.each(window.frontItemList, function(n, value) {
				if(value['fNIsChecked'] == 1) {
					meObj.arrDeleteId.push(value['lDisSkuId']);
					meObj.arrDeleteItemid.push(value['strFiid']);
					if($.inArray(value['lDistributorId'], meObj.arrDeleteShopId) == -1) {
						meObj.arrDeleteShopId.push(value['lDistributorId']);
					}
				}
			})
			$.each(window.vecCartActList, function(n, value) {
				if(value['nIsCheck'] == 1) {
					var tempActArr = {
						'act_id': value['lActivityId'],
						'act_type': value['nActivityType']
					}
					meObj.arrDeleteActInfo.push(tempActArr);
					if($.inArray(value['lDistributorId'], meObj.arrDeleteShopId) == -1) {
						meObj.arrDeleteShopId.push(value['lDistributorId']);
					}
				}
			})
			if(meObj.arrDeleteId.length > 0 || meObj.arrDeleteActInfo.length > 0) {
				if(meObj.handleType == 'collect') {
					commonDefine.method.commonPopV2({
						'popType': 'confirmV2',
						'autoClose': false,
						'title': '移入收藏夹后将不在购物车展示<br/><p style="font-size: 12px">套装商品不能移入收藏夹</p>',
						'leftBtnTxt': '取消',
						'leftBtnClass': '',
						'rightBtnTxt': '确认',
						'rightBtnClass': 'js_confirm_detele'
					});
				} else {
					commonDefine.method.cartPop('delConfirm');
				}
			} else {
				commonDefine.method.cartPop('selectMore');
			}
		},
		deleteConfirm: function(meObj) {
			if(meObj.arrDeleteId.length > 0 || meObj.arrDeleteActInfo.length > 0) {
				var para = {};
				meObj.arrDeleteShopId = commonDefine.method.uniqueArr(meObj.arrDeleteShopId);
				var _data = {};
				_data['del_type'] = 2;
				if(meObj.handleType != 'collect' && typeof(meObj.arrDeleteActInfo.length) != "undefined" && meObj.arrDeleteActInfo.length != 0) {
					_data['act_info'] = meObj.arrDeleteActInfo;
				}
				if(typeof(meObj.arrDeleteId.length) != "undefined" && meObj.arrDeleteId.length != 0) {
					_data['arr_id'] = meObj.arrDeleteId;
					_data['arr_itemid'] = meObj.arrDeleteItemid;
				}
				if(typeof(meObj.arrDeleteShopId.length) != "undefined" && meObj.arrDeleteShopId.length == 1) {
					meObj.deteleType = 1;
					_data['distributor_id'] = meObj.arrDeleteShopId[0];
				}
				if(meObj.itemType == 2) {
					_data['del_type'] = 2;
				}
				para = {
					_curObj: meObj,
					_data: _data,
					_success: meObj.deleteConfirmSuccess,
					_error: meObj.deleteConfirmFail
				};
				if(meObj.handleType == 'collect') {
					console.log("收藏");
					if(typeof(meObj.arrDeleteId.length) != "undefined" && meObj.arrDeleteId.length == 0) {
						return;
					} else {
						cartCommon.method.commonCollectDel(para);
					}
				} else {
					if(meObj.itemType == 1) {
						para._data = {
							'distributor_id': meObj.arrDeleteShopId[0],
							'act_id': meObj.giftActId
						};
						cartCommon.method.commonDeleteGift(para);
					} else {
						cartCommon.method.commonDelete(para);
					}
				}
			} else {
				commonDefine.method.cartPop('selectMore');
			}
		},
		clearInvalidConfirm: function(meObj) {
			var para = {
				_curObj: $(this),
				_data: {
					'fsid': fsId
				},
				_success: meObj.clearInvalidConfirmSuccess,
				_error: meObj.clearInvalidConfirmFail
			};
			cartCommon.method.commonClearExpireCatItem(para);
		},
		deleteConfirmSuccess: function(data, meObj) {
			var $thisShop = $(".js_cart_shop_" + meObj.arrDeleteShopId[0]);
			updateData($thisShop, data);
		},
		deleteConfirmFail: function() {
			commonDefine.method.cartPop('networkFail');
		},
		clearInvalidConfirmSuccess: function(data, meObj) {
			if(data.errcode == 0) {
				$(".cart_invalid_box").remove();
				var cartListLength = $(".cart_list_box").length;
				if(cartListLength == 0) {
					window.location.href = commonDefine.method.updateUrl(window.location.href);
				}
			} else {
				mError.checkCode(data);
			}
		},
		clearInvalidConfirmFail: function() {
			commonDefine.method.cartPop('networkFail');
		}
	};

	function parent(el, cls) {
		while(el && !el.classList.contains(cls)) {
			el = el.parentNode;
			if(!el.classList) el = null;
		}
		return el;
	}
	var slider = function(opt) {
		this.CONFIG = {
			BUFFER: 4,
			DISTANCE: $(".operate_box").width() + 3
		}
	};
	slider.prototype = {
		init: function(obj) {
			var el = obj[0];
			var eventList = 'ontouchstart' in window ? ['touchstart', 'touchmove', 'touchend', 'touchcancel'] : ['mousedown', 'mousemove', 'mouseup'];
			eventList.forEach(function(ev) {
				el.addEventListener(ev, this, false)
			}.bind(this));
		},
		handleEvent: function(ev) {
			switch(ev.type) {
				case 'touchstart':
				case 'mousedown':
					this.start(ev);
					break;
				case 'touchmove':
				case 'mousemove':
					this.move(ev);
					break;
				case 'touchend':
				case 'touchcancel':
				case 'mouseup':
					this.end(ev);
			}
		},
		start: function(ev) {
			var target = parent(ev.target, 'cart_item_content');
			this.target = target;
			var $operate_box = $(parent(ev.target, 'cart_item_box'));
			this.CONFIG.DISTANCE = $operate_box.find(".operate_box").width() + 3;
			var touch = ev.touches ? ev.touches[0] : ev;
			this.pageX = touch.pageX;
			this.pageY = touch.pageY;
		},
		move: function(ev) {
			if(this.pageX === undefined) return;
			var touch = ev.touches ? ev.touches[0] : ev;
			this.distX = touch.pageX - this.pageX;
			this.distY = touch.pageY - this.pageY;
			if(this.valid === undefined) {
				if(Math.abs(this.distX) > this.CONFIG.BUFFER || Math.abs(this.distY) > this.CONFIG.BUFFER) {
					this.valid = Math.abs(this.distX) > Math.abs(this.distY);
				} else {
					ev.preventDefault();
				}
			}
			if(this.valid === true) {
				if(this.distX <= 0) {
					if(Math.abs(this.distX) <= this.CONFIG.DISTANCE) {
						this.setOffset(this.distX);
					} else {
						var extra = (Math.abs(this.distX) - this.CONFIG.DISTANCE) * 0.5;
						this.setOffset(-(this.CONFIG.DISTANCE + extra));
					}
				}
				ev.preventDefault();
			}
		},
		end: function(ev) {
			if(this.valid === true && this.target) {
				if(this.distX < -this.CONFIG.DISTANCE * 0.2) {
					this.setOffset(-this.CONFIG.DISTANCE, true);
				} else {
					this.setOffset(0, true);
					this.target = undefined
				}
			} else if(this.pageX !== undefined) {
				this.target = undefined;
			}
			this.pageX = this.pageY = this.valid = undefined
		},
		setOffset: function(x, animated) {
			if(this.target) {
				if(animated) {
					var cb = (function(self, target) {
						return function() {
							target.classList.remove('animated');
							target.removeEventListener('webkitTransitionEnd', cb);
							target.removeEventListener('transitionend', cb);
						}
					})(this, this.target);
					this.target.addEventListener('webkitTransitionEnd', cb);
					this.target.addEventListener('transitionend', cb);
					this.target.classList.add('animated')
				}
				this.target.style.webkitTransform = 'translate3d(' + x + 'px, 0, 0)';
				this.target.style.transform = 'translate3d(' + x + 'px, 0, 0)';
			}
		}
	};
	exports.init = function() {
		initEvent();
		new slider().init($('#list'));
	}
});
define('module.error', function(require, exports, module) {
	var mUrl = require('url'),
		mpopup = null;

	function checkBrowser() {
		var ua = navigator.userAgent.toLowerCase(),
			channel = 3,
			regsrc = mUrl.getUrlParam('regsrc') || '',
			mh = mUrl.getUrlParam('midea_home') == 1 ? 1 : 0;
		if(mh == 1) {
			channel = 5;
		} else if(ua.indexOf('micromessenger') > -1) {
			channel = 1;
		} else if(/AppleWebKit.*Mobile/i.test(navigator.userAgent) || (/MIDP|SymbianOS|NOKIA|SAMSUNG|LG|NEC|TCL|Alcatel|BIRD|DBTEL|Dopod|PHILIPS|HAIER|LENOVO|MOT-|Nokia|SonyEricsson|SIE-|Amoi|ZTE/.test(navigator.userAgent))) {
			channel = 2;
		} else if(window.WebViewJavascriptBridge || window.md || location.href.indexOf('appview') > -1) {
			channel = 4;
		}
		return channel;
	}

	function showError(msg) {
		if(mpopup) {
			var confirmStr = checkBrowser() == 3 ? '确 认' : '确认';
			mpopup({
				type: 'confirmV2',
				title: msg,
				destroyAfterClose: true,
				autoClose: 2000,
				buttons: [{
					tpl: '<a  class="mod_popup_btn " href="javascript:void(0)" data-mpopup-confirm>' + confirmStr + '</a>'
				}]
			}).show();
		} else {
			alert(msg);
		}
	}
	exports.checkCode = function(obj, opt) {
		var channel = checkBrowser();
		var _opt = {
			'custom': false
		};
		for(var key in opt) {
			_opt[key] = opt[key];
		}
		if(!obj) {
			obj = {};
		}
		if(obj.errcode == 0) {
			return '';
		} else {
			var nErrCode = (obj.errcode || obj.errCode) * 1,
				strErrMsg = obj.errmsg || obj.errMsg;
			if(nErrCode == 1010 || nErrCode == 539299862 || nErrCode == 0x20251041 || nErrCode == 0x20251015) {
				if(_opt.custom) {
					return strErrMsg;
				} else {
					redirectLogin();
				}
			} else {
				if(_opt.custom) {
					return strErrMsg || '系统繁忙，请稍后再试';
				} else {
					showError(strErrMsg || '系统繁忙，请稍后再试');
				}
			}
		}
	};

	function redirectLogin() {
		if(location.host == 'mall.midea.com') {
			location.href = '/login/check_user?rurl=' + encodeURIComponent(location.href);
		} else {
			location.href = '/mlogin/check_user?rurl=' + encodeURIComponent(location.href);
		}
	}
	exports.setMpopup = function(obj) {
		mpopup = obj;
	}
});
define('zepto.mpopup.v2', function(require, exports, module) {
	var Zepto = $ = require("zepto");
	var Mpopup = function(options) {
		this.options = $.extend({}, Mpopup.defaults, options);
		this.style = '<style type="text/css" id="mpopupStyle">.mod_tips_popup{opacity:0;-webkit-transition:all linear .2s;z-index:-1;position:fixed;max-width: 50%;left:50%;top:20%;box-sizing:border-box;padding:15px;-webkit-transform:translateX(-50%);-moz-transform:translateX(-50%);-o-transform:translateX(-50%);-ms-transform:translateX(-50%);transform:translateX(-50%);width:auto;margin-left:auto;border-radius:10px;background-color:rgba(0,0,0,0.83)}.mod_tips_popup.no_transform{width:50%;margin-left:-25%;-webkit-transform: rotateX(0);-moz-transform: rotateX(0);-o-transform: rotateX(0);-ms-transform: rotateX(0);transform: rotateX(0);}.mod_tips_popup.mod_tips_popup_show{opacity:1;z-index:10000}.mod_tips_popup .mod_tips_cnt{color:#fff;text-align:center}.mod_tips_popup .mod_tips_cnt .mod_tips_ico{display:block;margin:0 auto 10px}.mod_tips_popup  .mod_tips_ico_right{width:31px;height:19px;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAAA6CAMAAAAHgr5qAAAAn1BMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8Kd3m4AAAANHRSTlMABQPz+ewJExwY4tknDeTTzjgxIgvdthHoyMTBppeSg1tFLA8HurGiilZPSz6qnXxzYa1sYvLAsgAAAYtJREFUWMO12NlygjAAheEEF3ABFcV937e22ub9n60jHiedQRhCT/47wfkcZEmCsFJ4O0thpYVSKoDNlh8tBb+jirvx5bl61rUm3+nyDDL/n/6EfKLLB8hnujyFfGHDzgfkFV3eW5P7kK/W5A5d3tmS5QRySJfHkNd0eWRNbkNu2pLLdHnbgtxly9UGZE8ka45LC/lfufROdh97RrKgHEGuvdv7E+9rF7J79SxZ3J97W1tz2X/Jbsovl2FXjeVAxVUgJ/NgNwztzRDyQKTmlVRcZGQPKpkyqsGu9/LLLuThRohctm8qBz7vm+bHqY/PRI56nLOSPO+NquG15ArEu1r9IJ/d1feY+X1byyVvaU8b1ITclgWfkV6qrJ6NJG3MQGvIY8hmdtZIF0KeSPYoqmX22N+BvHO4MxYt9x32POuKjXuHMjsM9bYVNn077DntBRumDnsmfn7J9PXDCR8O5FWPlmf0tdpSy+wVJpoLYtO/8lFQO9iR8Q4CLciwfnPyJSw0h2yjZRBdRKF+AXABgz00U2lzAAAAAElFTkSuQmCC") no-repeat;background-size:30px auto}.mod_tips_popup  .mod_tips_ico_error{width:22px;height:22px;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAABCCAMAAADUivDaAAAAe1BMVEUAAAD////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////NgkbwAAAAKHRSTlMAAQQHCg7q4tkRyqbUr6PlwLm1md3QzMiVw7yqnpCzgsVf7mZKQS8oNgOW6wAAAWlJREFUWMOd0dlywjAMhWHLZSv7vtOQAsXv/4RV00zPeIaB5j9Xtix9F1YIX0UZA0wsi7sLKaVdhELfh++hSDKIkIpwST+ZRiqk0g/Q0CA14ibpC2RQwa/r6rqPjYWzjzBDgkpvzYx4rto33g6NXJCxqsqz+A9hJwEYuUAMCX1vg0acSnhkDKvnecSCDEPCa0PC2gVoxP2v8Obn18aHYcGNnownAjHirCqvXCBGLjQyqCBjZFTwtGQECUMXoGFzCcSggoyDYUGGBGAs0196EoAhgRtc0DZ9L1gYpToD40JmUKHXlQGFVosadqiFEGpjbFgghoSlC5mBBGjYQEKdtgwmyDhaA6HrQmZMZAAhN6ggY2ENBGTYWMIjoyMDCLnBhNyggoytPRPaIUDDjhKAIWHiwqu8y4CCjFxYSGhgYEHGiQsycqHjAjRsKwEaEqhxhYIbn9XoLZwkMKMIVwnMuIVwWQ5cgMaoV4Zv6hd0ggaJuq4AAAAASUVORK5CYII=") no-repeat;background-size:22px auto}.mod_tips_popup  .mod_tips_ico_info{width:30px;height:30px;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAABCCAMAAADUivDaAAAAjVBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8DizOFAAAALnRSTlMArDSB9e3YtBsUPtR6JPpODAfaeF8u8MUpwa6OnpJCyJk6HuOiZOfmsHNySMxX8IUYOgAAAhFJREFUWMOtmOdu6kAQhY/xete9N3pPCEnm/R/vStElSgjrMQznDxKyP6097YxhVZBVSxN5aepFZlllAe7UNtaKqJyamePMzLQkUjreYrT8s6Z0HYdJcfmnSMJ4nZI+++MAc0VdvcMf7eqO1JyHFJWixQQWTRakqmKYsIrIaTCgxqFohQG5pDMwyjS59jCeaJODVb6hkyXESURHjNKRogQ31L+2K4zUqn3tb5xh/zLBaE1e9n/OEUSthWBhtPr6fRgKcZdCMtfRrHGnanJ/Ixe4W4ufB8+1zq3JEvxOaMtdMb3bCJ8eTW2t4p3i79pUDmyapR9kDZWjLnU7px7Wq7zKjuhpfjnEAQMI147A4f8x3qh5FNHQ29dv2eFRBLryq9NS/Tiipi0AV/mPI3zlAtBrPI7AWgOBiiWIWAXIKJQgQspQpYkE0VOFZVlIEPl+CTOFBIGpQWRkCBPBm8kQMw+pI0M46TMQ8gd5xuuUB1WaWkW5lCZ4klZ8mcVcmXHFflIHrti5luMStQnTcpjGV2SfDZjGx7RfRjVtmSHAqiv5UYQmy8GMImYgHlP62A0NRHYs+8rJaDMwlnlz0JMbqJPdHOxGWJQNUTthLApjlIp63jBGSWbX5Kbx2dYVgZYaaLmNly8T8pXmosCMXaxMIF7v5EumfNUVL9wj1/6SVHe99neKyrN/R/re+vhgKwH5J5B/sT0yx2fHhIoAAAAASUVORK5CYII=") no-repeat;background-size:30px auto;}.mod_tips_popup  .mod_tips_ico_star{width:30px;height:29px;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABXCAMAAACz6KLuAAAAnFBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+TINBkAAAAM3RSTlMAAgX7IwzzNlY/t7CbMOjayLyYi4R/eGxCGRAKCPfupqGTY1ErJ93OxHBnW01HquLVOpczDW4QAAACUklEQVRYw7TS2W6CYBiE4fmhbBYXBGUROHDBWDRq5v7vraYx1ioQK9//XMDkPRi8bjMty+kGGoT8EUJczKsYwizeWJA1480MohYmfy0gac47cwjKTd4xc/l7aDiJYfIP04CUJR98iUUXfFBIZdd8UkOEsvnEVpDgsoErEl2yQSmRvWejvUD0iI1G/bMPbHFAX0e2OKInj6089FOxVYVeHHZw0MeJHU7oYchOQ7zH+kh2FTtVu+TDwj/k6Xnpj/mysb88pzk6GalThxO+aRLWTmrgUbZeRUFBAUUQrdYZrlRsU5gdK1wYW2qwNQD41MIHMmqSIaEmCVxq4sKjJh4samIBEbWIAKiAGgQKF2pAcQMF3Lbll6/bupYB9Sm9rGf7uxZ7yU0YCIIAWmMPNsh8jAkSBBL+wiDCInX/u0ViQWTCuGc6wztArWrRXYVBg7kykqvBA7OKmtwUJXtlgNdkr+Cw5j+t4dSPkxw/u49WFdUqCDZU+gZelL2Bh02E5IgdXIdMNjLNsDNmsDH8fDBYCi8LKizgw1LBal9n2ZfnEKkwhY+aCjV8pFRIFQWJWRFLFQvZhSoXyN60R6+spEoJGZUg6ugfDMmBSgdIdlTaQTKhW1HQbQLJkS61BWxNl6O6IKMBbgYjOigLMuzhrjd0/fvt9nwi6za/k13GJ/bhO3h6TvAgOafyWi7fINMlnlhOg2+RE5uqdzh0KjadgpbfYo4W8yJoGU4y3pUWAlvyLksgyBtFFv3WPIcoz25FnsHT7FbzzxweTH7e7hHg0N0ODP74AY0RLzpq6NE6AAAAAElFTkSuQmCC") no-repeat;background-size:30px auto}.mod_tips_loading{width:68px;height:68px;margin-left:auto;top:40%}.mod_tips_loading.no_transform{width: 68px;left: 50%;   margin-left: -34px;-webkit-transform: rotateX(0);-moz-transform: rotateX(0);-o-transform: rotateX(0);-ms-transform: rotateX(0);transform: rotateX(0);}.mod_tips_loading .loader{-webkit-transform:scale(.5);transform:scale(.5);height:32px;margin-left:7px;margin-top:5px}.ball-spin-fade-loader{position:relative}.ball-spin-fade-loader > div:nth-child(1){top:25px;left:0;-webkit-animation:ball-spin-fade-loader 1s 0s infinite linear;animation:ball-spin-fade-loader 1s 0s infinite linear}.ball-spin-fade-loader > div:nth-child(2){top:17.04545px;left:17.04545px;-webkit-animation:ball-spin-fade-loader 1s .12s infinite linear;animation:ball-spin-fade-loader 1s .12s infinite linear}.ball-spin-fade-loader > div:nth-child(3){top:0;left:25px;-webkit-animation:ball-spin-fade-loader 1s .24s infinite linear;animation:ball-spin-fade-loader 1s .24s infinite linear}.ball-spin-fade-loader > div:nth-child(4){top:-17.04545px;left:17.04545px;-webkit-animation:ball-spin-fade-loader 1s .36s infinite linear;animation:ball-spin-fade-loader 1s .36s infinite linear}.ball-spin-fade-loader > div:nth-child(5){top:-25px;left:0;-webkit-animation:ball-spin-fade-loader 1s .48s infinite linear;animation:ball-spin-fade-loader 1s .48s infinite linear}.ball-spin-fade-loader > div:nth-child(6){top:-17.04545px;left:-17.04545px;-webkit-animation:ball-spin-fade-loader 1s .6s infinite linear;animation:ball-spin-fade-loader 1s .6s infinite linear}.ball-spin-fade-loader > div:nth-child(7){top:0;left:-25px;-webkit-animation:ball-spin-fade-loader 1s .72s infinite linear;animation:ball-spin-fade-loader 1s .72s infinite linear}.ball-spin-fade-loader > div:nth-child(8){top:17.04545px;left:-17.04545px;-webkit-animation:ball-spin-fade-loader 1s .84s infinite linear;animation:ball-spin-fade-loader 1s .84s infinite linear}.ball-spin-fade-loader > div{background-color:#fff;width:15px;height:15px;border-radius:100%;margin:2px;-webkit-animation-fill-mode:both;animation-fill-mode:both;position:absolute}@-webkit-keyframes ball-spin-fade-loader{50%{opacity:.3;-webkit-transform:scale(0.4);transform:scale(0.4)}100%{opacity:1;-webkit-transform:scale(1);transform:scale(1)}}@keyframes ball-spin-fade-loader{50%{opacity:.3;-webkit-transform:scale(0.4);transform:scale(0.4)}100%{opacity:1;-webkit-transform:scale(1);transform:scale(1)}}.mod_popup.mod_popup_show{opacity:1;z-index:10000}.mod_popup{position:fixed;z-index:-1;top:100px;left:50%;width:60%;margin-left:-30%;background:#fff;border-radius:5px;opacity:0;-webkit-transition:all linear .2s;z-index:-1}.mod_popup_confirm_hd{padding:25px 20px 10px;text-align:center;font-size:16px}.mod_popup_confirm_bd{padding:0 20px 10px}.mod_popup_confirm_ft{margin-top:15px;text-align:center;border-top:#eee solid 1px}.mod_popup_confirm_ft .mod_popup_btn{height:46px;line-height:46px;font-size:15px;color:#008fdb}.mod_popup_btns_inline .mod_popup_btn{position:relative;float:left;width:50%}.mod_popup_btns_inline .mod_popup_btn:first-child::after{content:"";position:absolute;width:1px;height:100%;background:#eee;right:0;top:0}.mod_popup_btns_block .mod_popup_btn{display:block;border-top:#eee solid 1px}.mod_popup_btns_block .mod_popup_btn:first-child{border-top:none}.mod_popup .mod_popup_confirm_ft:first-child{margin-top:0;border-top:none}</style>';
		this.loadingTpl = '<div class="mod_tips_popup mod_tips_loading" id="tips"><div class="loader"><div class="loader-inner ball-spin-fade-loader"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div></div>';
		this.loadingToggleCls = 'mod_tips_popup_show';
		this.confirmV2Tpl = '<div class="mod_popup mod_popup_confirm"><h3 class="mod_popup_confirm_hd">{#title#}</h3><div class="mod_popup_confirm_bd J_popup_confirm_content">{#content#}</div>{#buttons#}</div>';
		this.popupToggleCls = 'mod_popup_show';
		this.buttonsPopupTpl = '<div class="mod_popup mod_popup_button">{#buttons#}</div>';
		this._init();
	}
	Mpopup._list = {};
	Mpopup.prototype = {
		constructor: Mpopup,
		_init: function() {
			var opts = this.options,
				cls = opts.className,
				self = this;
			this.id = opts.id || 'Mpopup' + new Date().getTime() + parseInt(Math.random() * 100);
			if(Mpopup._list[this.id]) {
				this.$popup = $('#' + this.id);
				return;
			}
			Mpopup._list[this.id] = this;
			if($('#' + this.id).length == 0) {
				this._create();
			}
			if($('#mpopupStyle').length == 0) {
				$('head').append(this.style);
			}
			this._getPopupElem();
			this.$popup.css(opts.css || {});
			this.$popup.addClass(this.options.setClass || '')
			this.hasMask = opts.mask;
			this.onShow = opts.onShow;
			this.onClose = opts.onClose;
			this.onConfirm = opts.onConfirm;
			this._bindEvent();
		},
		_getPopupElem: function() {
			var opts = this.options;
			if(opts.id == '') {
				var $popup = $('#' + this.id).children().eq(0);
			} else {
				var $popup = $('#' + this.id);
			}
			this.$popup = $popup;
		},
		_bindEvent: function() {
			var self = this;
			this.$popup.find('[data-mpopup-close]').on('click', function(e) {
				e.preventDefault
				self.close();
			});
			this.confirm();
		},
		_create: function() {
			var opts = this.options,
				popupTpl = opts.popupTpl,
				contentTpl = opts.contentTpl,
				content = opts.content,
				title = opts.title,
				contentTxt = opts.contentTxt,
				appendTo = opts.popupAppendTo == '' ? 'body' : opts.popupAppendTo,
				icoHtml = '',
				buttonsHtml = '',
				contentHtml = '',
				popupHtml = '';
			if(opts.type == 'confirm') {
				if(opts.icoType !== '') {
					icoHtml = this._getIcoHtml();
				} else {
					icoHtml = '';
				}
				if(opts.buttons !== null) {
					buttonsHtml = this._getButtonsHtml();
				} else {
					buttonsHtml = '';
				}
				contentHtml = contentTpl.replace(/\{#contentTxt#\}/, contentTxt).replace(/\{#icoType#\}/, icoHtml).replace(/\{#buttons#\}/, buttonsHtml);
				popupHtml = popupTpl.replace(/\{#content#\}/, contentHtml);
			} else if(opts.type == 'info') {
				opts.contentAppendTo = '.J_tips_content';
				if(opts.icoType !== '') {
					icoHtml = this._getIcoHtml();
				} else {
					icoHtml = '';
				}
				buttonsHtml = '';
				contentHtml = contentTpl.replace(/\{#contentTxt#\}/, contentTxt).replace(/\{#icoType#\}/, icoHtml).replace(/\{#buttons#\}/, buttonsHtml);
				popupHtml = popupTpl.replace(/\{#content#\}/, contentHtml);
			} else if(opts.type == 'loading') {
				popupHtml = this.loadingTpl;
			} else if(opts.type == 'confirmV2') {
				opts.contentAppendTo = '.J_popup_confirm_content';
				contentTpl = this.confirmV2Tpl;
				if(opts.buttons !== null) {
					buttonsHtml = this._getButtonsHtml();
				} else {
					buttonsHtml = '';
				}
				popupHtml = contentTpl.replace(/\{#content#\}/, content).replace(/\{#title#\}/, title).replace(/\{#buttons#\}/, buttonsHtml);
			} else if(opts.type == 'buttons') {
				contentTpl = this.buttonsPopupTpl
				if(opts.buttons !== null) {
					buttonsHtml = this._getButtonsHtml();
				} else {
					buttonsHtml = '';
				}
				popupHtml = contentTpl.replace(/\{#buttons#\}/, buttonsHtml);
			}
			var $html = $('<div id="' + this.id + '" >' + popupHtml + '</div>');
			if(!this._isSupport('transform')) {
				$html.addClass('no_transform');
			}
			$html.appendTo(appendTo);
		},
		_getIcoHtml: function() {
			var opts = this.options;
			for(var i in opts.icoTypeGroup) {
				if(this.options.icoType == opts.icoTypeGroup[i].type) {
					return opts.icoTypeGroup[i].tpl;
				}
			}
		},
		_getButtonsHtml: function() {
			var opts = this.options;
			var buttonHtml = '',
				buttonWrap = '';
			if(opts.buttons.length > 2 || opts.type == 'buttons') {
				buttonWrap = '<div class="mod_popup_confirm_ft mod_popup_btns_block">{#buttons#}</div>';
			} else if(opts.buttons.length == 1) {
				buttonWrap = '<div class="mod_popup_confirm_ft mod_popup_btns_block">{#buttons#}</div>';
			} else {
				buttonWrap = '<div class="mod_popup_confirm_ft mod_popup_btns_inline">{#buttons#}</div>';
			}
			for(var i = 0; i < opts.buttons.length; i++) {
				buttonHtml += opts.buttons[i].tpl;
			}
			buttonHtml = buttonWrap.replace(/\{#buttons#\}/, buttonHtml)
			return buttonHtml;
		},
		_isSupport: function(prop) {
			var div = document.createElement('div'),
				vendors = 'Khtml O Moz Webkit'.split(' '),
				len = vendors.length;
			if(prop in div.style) return true;
			if('-ms-' + prop in div.style) return true;
			prop = prop.replace(/^[a-z]/, function(val) {
				return val.toUpperCase();
			});
			while(len--) {
				if(vendors[len] + prop in div.style) {
					return true;
				}
			}
			return false;
		},
		setContent: function(tpl) {
			var opts = this.options;
			if(opts.contentAppendTo == '') {
				return;
			}
			if(!tpl) {
				this.$popup.find(opts.contentAppendTo).html(opts.contentTpl);
			} else {
				this.$popup.find(opts.contentAppendTo).html(tpl);
			}
			return this;
		},
		show: function(clsName) {
			var self = this;
			if(this.isShow) {
				return;
			}
			var opts = this.options;
			var $popup = this.$popup;
			if(clsName !== undefined) {
				this.toggleClass = clsName;
				setTimeout(function() {
					$popup.toggleClass(clsName);
				}, 0);
			} else {
				if(opts.toggleCls !== '') {
					this.toggleClass = opts.toggleCls;
					if(opts.type == 'loading') {
						this.toggleClass = this.loadingToggleCls;
					} else if(opts.type == 'confirmV2' || opts.type == 'buttons') {
						this.toggleClass = this.popupToggleCls;
					}
					var toggleCls = this.toggleClass;
					setTimeout(function() {
						$popup.toggleClass(toggleCls);
					}, 0);
				} else {
					$popup.show();
				}
			}
			if(typeof this.onShow === 'function') {
				this.onShow($('#' + this.id));
			}
			$(this).trigger('show:mpopup', [this.$popup]);
			if(opts.autoClose) {
				window.setTimeout(function() {
					self.close(this.toggleClass);
				}, opts.autoClose);
			}
			if(this.hasMask) {
				Mpopup.mask.show();
				if(opts.clickMaskClose) {
					$('#mpopupMask').on('click', function(e) {
						e.preventDefault();
						self.close();
					});
				}
			}
			this.isShow = true;
			return this;
		},
		confirm: function() {
			var self = this;
			var opts = self.options;
			self.$popup.find('[data-mpopup-confirm]').on('click', function(e) {
				e.preventDefault;
				if(typeof self.onConfirm === 'function') {
					self.onConfirm($(e.target));
				}
				$(self).trigger('confirm:mpopup', [$(e.target)]);
				if(opts.destroyAfterClose) {
					self.destory();
				} else {
					self.hide();
				}
			});
			return this;
		},
		hide: function() {
			if(!this.isShow) {
				return;
			}
			var opts = this.options;
			var $popup = this.$popup;
			var closeMask = true;
			if(this.toggleClass !== undefined) {
				$popup.toggleClass(this.toggleClass);
			} else {
				$popup.hide();
			}
			if(this.hasMask) {
				for(id in Mpopup._list) {
					var instance = Mpopup._list[id];
					if(instance !== this && instance.hasMask && instance.isShow) {
						closeMask = false;
						break;
					}
				}
				if(closeMask) {
					closeMask && Mpopup.mask.hide();
				}
			}
			this.isShow = false;
			$(this).trigger('hide:mpopup', [this.$popup]);
			return this;
		},
		close: function() {
			var opts = this.options;
			if(typeof this.onClose === 'function') {
				this.onClose($('#' + this.id));
			}
			if(opts.destroyAfterClose) {
				this.destory();
			} else {
				this.hide();
			}
			$(this).trigger('close:mpopup', [this.$popup]);
		},
		destory: function() {
			var self = this;
			var opts = this.options;
			var $popup = this.$popup;
			this.hide();
			if(this.toggleClass) {
				if($popup.css('-webkit-transition-duration') !== '0s') {
					$popup.on('webkitTransitionEnd', function() {
						if(!Mpopup._list[self.id]) {
							return;
						}
						$('#' + self.id).remove();
						delete Mpopup._list[self.id];
					}, false);
				} else {
					$('#' + this.id).remove();
					delete Mpopup._list[this.id];
				}
			} else {
				$('#' + this.id).remove();
				delete Mpopup._list[this.id];
			}
			$(this).trigger('destory:mpopup', []);
		},
		css: function(style) {
			this.$popup.css(style);
			return this;
		}
	}
	Mpopup.mask = {
		isShow: false,
		layer: null,
		show: function() {
			if(this.isShow) {
				return;
			}
			if(!this.layer) {
				this.layer = $('<div id="mpopupMask" />').css({
					position: 'fixed',
					left: 0,
					top: 0,
					height: '100%',
					width: '100%',
					background: 'rgba(0,0,0,0.2)',
					zIndex: 999
				}).appendTo('body');
			}
			this.layer.show();
			this.isShow = true;
		},
		hide: function() {
			if(!this.isShow || !this.layer) {
				return;
			}
			this.layer.hide();
			this.isShow = false;
		},
		setStyle: function(background, opacity) {
			this.layer.css({
				background: background,
				opacity: opacity
			});
		},
		setZIndex: function(zIndex) {
			this.layer.css('z-Index', zIndex);
		}
	}
	Mpopup.defaults = {
		id: '',
		type: 'confirm',
		popupAppendTo: '',
		popupTpl: '<div class="mod_tips_popup">{#content#}</div>',
		contentTpl: '<div class="mod_tips_cnt">{#icoType#}<div class="J_tips_content">{#contentTxt#}</div></div><div class="mod_tips_ft">{#buttons#}</div>',
		contentAppendTo: '.mod_tips_cnt',
		content: '',
		contentTxt: '',
		toggleCls: 'mod_tips_popup_show',
		title: '',
		css: null,
		setClass: null,
		mask: true,
		destroyAfterClose: false,
		clickMaskClose: false,
		autoClose: false,
		zIndex: null,
		icoType: 'info',
		icoTypeGroup: [{
			type: 'info',
			tpl: '<i class="mod_tips_ico mod_tips_ico_info"></i>'
		}, {
			type: 'right',
			tpl: '<i class="mod_tips_ico mod_tips_ico_right"></i>'
		}, {
			type: 'error',
			tpl: '<i class="mod_tips_ico mod_tips_ico_error"></i>'
		}, {
			type: 'star',
			tpl: '<i class="mod_tips_ico mod_tips_ico_star"></i>'
		}],
		buttons: [{
			tpl: '<a  class="mod_popup_btn " href="javascript:void(0)" data-mpopup-confirm>确认</a>'
		}, {
			tpl: '<a  class="mod_popup_btn" data-mpopup-close href="javascript:void(0)">取消</a>'
		}],
		onConfirm: null,
		onShow: null,
		onClose: null
	};
	window.Mpopup = Mpopup;
	$.mpopup = function(options) {
		return new Mpopup(options);
	}
});