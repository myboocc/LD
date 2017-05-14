define('commonlistv2', function(require, exports, module) {
	var $ = require('zepto'),
		mDemandLoad = require('demandLoad'),
		mLocalcache = require('localcache'),
		mPullRefresh = require('pullrefresh'),
		mLog = require('log');

	function Commonlist(opt) {
		var me = this,
			_opt = $.extend({
				id: location.pathname + location.search,
				domId: '',
				reqUrl: '',
				pageno: 1,
				pagesize: 10,
				startPageno: 1,
				params: {},
				tmplId: '',
				scrollDom: '',
				preHeight: 0,
				emptyMsg: '暂无数据',
				errMsgId: 'emptyTips',
				errMsg: '系统繁忙，请稍后再试',
				disableCache: false,
				cacheTime: 20,
				requestTimeout: 10000,
				firstList: document.querySelector('.J_first'),
				usePullRefresh: false,
				captureClick: true,
				success: function(obj, callback) {},
				error: function(obj) {},
				render: function(contentObj, datas, pageno, total) {}
			}, opt),
			_domObj, _dl, _reqStateCacheKey, _reqStateCacheData, _loadingTag, _jMsg, _dataCache = {},
			_arrRenderCallback = [];

		function _init() {
			_domObj = $('#' + _opt.domId);
			if(_domObj.length === 0) {
				console.error('根据domId找不到dom元素');
				return false;
			}
			_opt.scrollDom = _opt.scrollDom ? $(_opt.scrollDom) : $(document.body);
			_jMsg = $('#' + _opt.errMsgId);
			_reqStateCacheKey = _getCacheKey('reqstate');
			_reqStateCacheData = mLocalcache.get(_reqStateCacheKey);
			mLocalcache.remove(_reqStateCacheKey);
			_pushDataToCacheFromLocalstorage();
			_initRefresh();
			_initDemandLoad();
		}

		function _getCacheKey(name) {
			return ['cl', _opt.id, _opt.domId, name].join('_');
		}

		function _setCacheData(cacheKey, cacheData) {
			mLocalcache.set(cacheKey, cacheData, _opt.cacheTime);
		}

		function _initDemandLoad(resetConf, isPullRefresh) {
			if(_dl) {
				_dl.reset(resetConf, isPullRefresh);
			} else {
				_dl = mDemandLoad.init({
					pageno: (_reqStateCacheData && _reqStateCacheData.reqParams.pageno) || _opt.pageno,
					pagesize: (_reqStateCacheData && _reqStateCacheData.reqParams.pagesize) || _opt.pagesize,
					startPageno: _opt.startPageno,
					preHeight: _opt.preHeight,
					domObj: _domObj,
					scrollDom: _opt.scrollDom[0],
					tmplId: _opt.tmplId,
					siblingPageNum: 4,
					startHeight: (_reqStateCacheData && _reqStateCacheData.pageState.startHeight) || 0,
					initScrollTop: (_reqStateCacheData && _reqStateCacheData.pageState.initScrollTop) || 0,
					itemTag: _opt.itemTag,
					IloadData: function(pageno, pagesize, loadtype, isPullRefresh) {
						var func = arguments.callee,
							args = arguments,
							context = this,
							reqParams = (_reqStateCacheData && _reqStateCacheData.reqParams) || _opt.params;
						clearTimeout(_loadingTag);
						hideMsg();
						if(!isPullRefresh) {
							showMsg(0, '<div style="padding:10px;"><img style="margin:0 5px;width:20px;" src="//img.mdcdn.cn/h5/img/common/loading32.gif" />加载中，请稍候...</div>');
							_loadingTag = setTimeout(function() {
								showMsg(0, '<div onclick="requestReload();">轻触此处重新加载。</div>');
								window.requestReload = function() {
									func.apply(context, args);
								}
							}, _opt.requestTimeout);
						}
						reqParams.pageno = pageno;
						reqParams.pagesize = pagesize;
						_getDataList(reqParams, (function(demandLoadObj, pageno, loadtype) {
							return function(datas, total) {
								clearTimeout(_loadingTag);
								hideMsg();
								var contentObj = demandLoadObj.renderData(datas, pageno, loadtype, total);
								_bindEventForList(contentObj);
								_arrRenderCallback.push(function() {
									_opt.render(contentObj, datas, pageno, total);
								});
								_execCallbacks(_arrRenderCallback);
							}
						})(this, pageno, loadtype));
					}
				});
				$(_opt.firstList).click(function() {
					if(!_opt.captureClick) {
						return true;
					}
					_setReqStateCache({
						initScrollTop: _getScrollTop()
					});
				});
			}
		}

		function _getDataList(oReq, dataLoaded) {
			var oCacheData = _getDataListCache(oReq.pageno);
			if(oCacheData) {
				_opt.success(oCacheData, execData);
			} else {
				$.ajax({
					url: _opt.reqUrl,
					data: $.extend({
						t: Math.random()
					}, oReq),
					type: "get",
					dataType: "json",
					success: function(obj) {
						if(obj.errcode == 0) {
							_opt.success(obj, execData);
							if(obj.pageno == 1 && ($.trim(obj.data) == '' || obj.data.length == 0)) {
								showMsg(1, _opt.emptyMsg);
							} else {
								_setDataListCache(obj, 1);
							}
						} else {
							showMsg(1, obj.errmsg);
							_opt.error(obj);
						}
					},
					error: function(e) {
						var obj = {
							errCode: '-1',
							errcode: '-1',
							errmsg: '请求异常，请稍后再试。'
						};
						showMsg(1, obj.errmsg);
						_opt.error(obj);
					}
				});
			}

			function execData(arrData, nTotal) {
				dataLoaded(arrData, nTotal);
			}
		}

		function _getScrollTop() {
			return _opt.scrollDom ? _opt.scrollDom.scrollTop() : window.scrollY;
		}

		function _bindEventForList(contentObj) {
			contentObj.unbind('click').click(function() {
				if(!_opt.captureClick) {
					return true;
				}
				var pageno = contentObj.attr('data-pageno') * 1,
					startHeight = 0,
					prevObj = this.previousSibling;
				while(prevObj) {
					if(prevObj.nodeType == 1) {
						startHeight += $(prevObj).height();
					}
					prevObj = prevObj.previousSibling;
				}
				startHeight += $('.tempUp').height();
				_setReqStateCache({
					pageno: pageno,
					pagesize: _opt.pagesize,
					initScrollTop: _getScrollTop(),
					startHeight: startHeight
				});
				_setDataListCache([_dataCache[pageno - 1], _dataCache[pageno], _dataCache[pageno + 1]], 2);
			});
		}

		function _initRefresh() {
			if(_opt.usePullRefresh) {
				mPullRefresh.init({
					refreshDom: _domObj,
					onRelease: function() {
						_arrRenderCallback.push(this.afterPull);
						me.reset({
							pageno: 1,
							startHeight: 0,
							initScrollTop: 0
						}, true);
					}
				})
			}
		}

		function _setReqStateCache(data) {
			if(!_reqStateCacheData) {
				_reqStateCacheData = {
					reqParams: {},
					pageState: {}
				};
			}
			_reqStateCacheData.reqParams = _opt.params;
			_reqStateCacheData.reqParams.pageno = data.pageno;
			_reqStateCacheData.reqParams.pagesize = data.pagesize;
			_reqStateCacheData.pageState.initScrollTop = data.initScrollTop;
			_reqStateCacheData.pageState.startHeight = data.startHeight;
			_setCacheData(_reqStateCacheKey, _reqStateCacheData);
		}

		function _setDataListCache(data, cacheType) {
			if(!_opt.disableCache) {
				if(!$.isArray(data)) {
					data = [data];
				}
				for(var i = 0; i < data.length; i++) {
					if(cacheType === 1) {
						_dataCache[data[i].pageno] = data[i];
					} else {
						if(data[i]) {
							_setCacheData(['cl', _opt.id, _opt.domId, 'list', data[i].pageno].join('_'), data[i]);
						}
					}
				}
			}
		}

		function _getDataListCache(pageno) {
			if(!_opt.disableCache) {
				return _dataCache[pageno];
			}
		}

		function _pushDataToCacheFromLocalstorage() {
			var keys = mLocalcache.getAllKeys();
			for(var i = 0; i < keys.length; i++) {
				var prefix = ['cl', _opt.id, _opt.domId, 'list'].join('_');
				if(keys[i].indexOf(prefix) > -1) {
					var pageno = keys[i].split(prefix + '_')[1] * 1,
						key = prefix + '_' + pageno,
						data = mLocalcache.getItem(key);
					mLocalcache.remove(key);
					_dataCache[pageno] = data;
				}
			}
		}

		function _clearCache() {
			mLocalcache.remove(_reqStateCacheKey);
			_reqStateCacheData = null;
			_dataCache = [];
		}

		function showMsg(type, msg) {
			var errMsg = msg;
			if(!errMsg) {
				errMsg = '系统繁忙，请稍后再试';
			}
			_jMsg.html(errMsg).show();
		}

		function hideMsg() {
			_jMsg.html('').hide();
		}

		function _execCallbacks(cbs) {
			var cb;
			while((cb = cbs.shift())) {
				cb();
			}
		}
		this.reset = function(opt, isPullRefresh) {
			_clearCache();
			_opt = $.extend(_opt, opt);
			_initDemandLoad(_opt, isPullRefresh);
			return this;
		};
		this.backToTop = function() {
			if(_domObj.find('div[attr-pageno="' + _opt.startPageno + '"]').length === 0) {
				this.reset();
			}
			if(_opt.scrollDom) {
				_opt.scrollDom.scrollTop(0);
			} else {
				window.scrollTo(0, 0);
			}
			return this;
		};
		_init();
	}
	exports.init = function(opt) {
		return new Commonlist(opt);
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
define('demandLoad', function(require, exports, module) {
	var $ = require('zepto'),
		fj = require('formatJson'),
		scrollCtrl = require('scrollCtrl'),
		mLog = require('log');

	function DemandLoad(opt) {
		!DemandLoad.guid && (DemandLoad.guid = 100);
		var _opt = $.extend({
				pageno: 1,
				pagesize: 20,
				startPageno: 1,
				startHeight: 0,
				total: 0,
				preHeight: 0,
				itemTag: 'li',
				isLast: null,
				domObj: null,
				scrollDom: null,
				tmplId: null,
				isDeleteNode: true,
				siblingPageNum: 99,
				initScrollTop: 0,
				IloadData: null,
				timeout: 5000
			}, opt),
			me = this,
			_contentPrefix = 'datapage' + DemandLoad.guid + '_',
			_tmpl, _scrCtrl, _tempUp, _upLine, _downLine, _maxPageno, _upPageno, _renderCallbacks = [];
		typeof _opt.domObj === 'string' ? (_opt.domObj = $('#' + _opt.domObj)) : '';
		this.renderData = function(datas, pageno, loadtype, total) {
			mLog('render pageno：' + pageno);
			var pagesize = _opt.pagesize,
				contentStr, contentId, contentObj;
			_opt.total = total;
			_opt.isLast = _checkIsLast(pageno);
			datas.pageno = pageno;
			datas.pagesize = pagesize;
			contentId = _contentPrefix + pageno;
			if(_tmpl) {
				contentStr = fj.render(_tmpl, {
					data: datas
				});
			} else {
				contentStr = datas;
			}
			contentObj = $('#' + contentId);
			if(contentObj.length > 0) {
				contentObj.html(contentStr);
			} else {
				contentStr = '<div id="' + contentId + '" class="list_page" data-pageno=' + pageno + '>' + contentStr + '</div>';
				loadtype === 'next' ? _opt.domObj.append(contentStr) : _opt.domObj.prepend(contentStr);
				contentObj = $('#' + contentId);
			}
			if(_opt.initScrollTop > 0) {
				_setScrollTop(_opt.initScrollTop);
				_opt.initScrollTop = null;
			}
			while(_renderCallbacks.length > 0) {
				var func = _renderCallbacks.shift();
				func(contentObj, pageno);
			}
			_scrCtrl.on(contentObj.find('img[init_src]'), function() {
				var imgUrl = this.getAttribute('init_src');
				var imgObj = new Image();
				var that = this;
				imgObj.onload = function() {
					that.src = imgUrl;
				};
				imgObj.src = imgUrl;
				this.removeAttribute('init_src');
			});
			setTimeout(function() {
				_initDownBorder();
				_initUpBorder();
				_clearDoms(pageno);
			}, 100);
			return contentObj;
		};
		this.reset = function(opt, isPullRefresh) {
			_opt = $.extend(_opt, {
				pageno: _opt.startPageno,
				pagesize: 20
			}, opt);
			_scrCtrl.clear();
			if(isPullRefresh) {
				_opt.domObj.find('>div').map(function(index, item) {
					if(index != 0) {
						$(item).remove();
					}
				});
			} else {
				_opt.domObj.html('');
			}
			_tempUp.remove();
			_upLine.remove();
			_downLine.remove();
			_init(isPullRefresh);
		};

		function _calcDom() {
			if(_opt.pageno < _opt.startPageno) {
				_opt.pageno = _opt.startPageno;
			}
			_opt.isLast = _checkIsLast(_opt.pageno);
			_upPageno = _opt.pageno;
		}

		function _initPageStructor() {
			_tempUp = _createDom('DIV', '_tempUp' + DemandLoad.guid);
			_upLine = _createDom('DIV', '_upLine' + DemandLoad.guid);
			_downLine = _createDom('DIV', '_downLine' + DemandLoad.guid);
			_opt.domObj.before(_tempUp);
			_opt.domObj.before(_upLine);
			_opt.domObj.after(_downLine);
			_tempUp = $('#_tempUp' + DemandLoad.guid);
			_upLine = $('#_upLine' + DemandLoad.guid);
			_downLine = $('#_downLine' + DemandLoad.guid);
			_tempUp.addClass('tempUp');
			if(_opt.preHeight) {
				_tempUp.css('height', (_opt.pageno - _opt.startPageno) * _opt.pagesize * _opt.preHeight);
			} else {
				_tempUp.css('height', _opt.startHeight);
			}
			if(_opt.tmplId) {
				_tmpl = $('#' + _opt.tmplId).html();
			}
			if(!_scrCtrl) {
				_scrCtrl = scrollCtrl.init(_opt.scrollDom);
			}
		}

		function _next() {
			if(_maxPageno >= (_opt.pageno + 1)) {
				++_opt.pageno;
				_opt.IloadData && _opt.IloadData.apply(me, [_opt.pageno, _opt.pagesize, 'next']);
			}
		}

		function _prev() {
			var pageno = _upPageno - 1;
			if(pageno >= _opt.startPageno) {
				_opt.IloadData && _opt.IloadData.apply(me, [pageno, _opt.pagesize, 'prev']);
				--_upPageno;
			}
		}

		function _clearDoms(pageno) {
			if(_opt.isDeleteNode) {
				var prevno = pageno - _opt.siblingPageNum,
					nextno = pageno + _opt.siblingPageNum,
					contentObj, lis;
				if(prevno > (_opt.startPageno - 1)) {
					contentObj = $('#' + _contentPrefix + prevno);
					lis = contentObj.find(_opt.itemTag);
					if(lis.length > 0) {
						_tempUp.css('height', _tempUp.height() + contentObj.height());
						contentObj.html('');
						_upPageno = prevno + 1;
					}
				}
				if(nextno > 0) {
					contentObj = $('#' + _contentPrefix + nextno);
					lis = contentObj.find(_opt.itemTag);
					if(lis.length > 0) {
						contentObj.html('');
						_opt.pageno = nextno - 1;
						_maxPageno = (Math.ceil(_opt.total / _opt.pagesize)).toFixed(0) * 1;
					}
				}
			}
		}

		function _initDownBorder() {
			_scrCtrl.on(_downLine[0], function(obj) {
				if(!_opt.isLast) {
					_next();
				}
			});
		}

		function _initUpBorder() {
			_scrCtrl.on(_upLine[0], 'beforeTop', function(obj) {
				mLog('_upPageno:' + _upPageno);
				_renderCallbacks.push((function() {
					return function(contentObj, pageno) {
						var difHeight = _tempUp.height() - contentObj.height();
						_tempUp.css('height', difHeight < 0 ? 0 : difHeight);
					}
				})());
				_prev();
			});
		}

		function _checkIsLast(pageno) {
			_maxPageno = (Math.ceil(_opt.total / _opt.pagesize)).toFixed(0) * 1;
			return _maxPageno <= pageno;
		}

		function _createDom(tag, id) {
			var dom = document.createElement(tag);
			dom.id = id;
			return dom;
		}

		function _setScrollTop(st) {
			_opt.scrollDom ? $(_opt.scrollDom).scrollTop(st) : window.scrollTo(0, st);
		}

		function _init(isPullRefresh) {
			DemandLoad.guid++;
			_initPageStructor();
			_calcDom();
			if(_opt.initScrollTop > 0) {
				_setScrollTop(_opt.initScrollTop);
			}
			if(isPullRefresh) {
				_opt.IloadData && _opt.IloadData.apply(me, [_opt.pageno, _opt.pagesize, 'next', isPullRefresh]);
				_scrCtrl.clear();
			} else {
				setTimeout(function() {
					_scrCtrl.on(_tempUp, 'beforeBottom', function() {
						_opt.IloadData && _opt.IloadData.apply(me, [_opt.pageno, _opt.pagesize, 'next']);
					});
				}, 100);
			}
		}
		_init();
	}
	exports.init = function(opt) {
		return new DemandLoad(opt);
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
define('loadUrl', function(require, exports, module) {
	function $loadUrl(o) {
		o.element = o.element || 'script';
		var el = document.createElement(o.element);
		el.charset = o.charset || 'utf-8';
		o.onBeforeSend && o.onBeforeSend(el);
		el.onload = el.onreadystatechange = function() {
			if(/loaded|complete/i.test(this.readyState) || navigator.userAgent.toLowerCase().indexOf("msie") == -1) {
				o.onload && o.onload();
				clear();
			}
		};
		el.onerror = function() {
			clear();
		};
		el.src = o.url;
		document.getElementsByTagName('head')[0].appendChild(el);

		function clear() {
			if(!el) {
				return;
			}
			el.onload = el.onreadystatechange = el.onerror = null;
			el.parentNode && (el.parentNode.removeChild(el));
			el = null;
		}
	}
	exports.get = $loadUrl;
});
define('log', function(require, exports, module) {
	var mUrl = require('url');
	var Log = function(msg) {
		if(Log.level == 'debug') {
			console.log(msg);
		}
	};
	Log.level = mUrl.getUrlParam('debug') == 1 ? 'debug' : '';
	return Log;
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
define('mmd.detail.index_v2', function(require, exports, module) {
	var $ = require('zepto'),
		URL = require('url'),
		cookie = require('cookie'),
		QRcode = require('qrcode'),
		report = require('report'),
		mCommonlist = require('commonlistv2'),
		mPreviewImage = require('mmd.previewimage'),
		mError = require('module.error'),
		formatJson = require('formatJson'),
		mXss = require('xss');
	require('swiper');
	require('mmd.address');
	require('zepto.mpopup.v2');
	var oBuyInfo = {},
		nSkuid = lDisSkuId,
		nBuyNum = 1,
		eventType = 'click',
		mCommonlistDomId = 'asynCommentList',
		isDetailPic = true;
	var oLoad, oSuccess, oWarn, oFail, oCollect;
	mError.setMpopup($.mpopup);

	function commonJump(url_para, type) {
		var url = 'https://w.midea.com/wxorder/buyer/confirmorder',
			presell_url = 'https://w.midea.com/wxorder/buyer/confirm_order_presell',
			seckill_url = 'https://w.midea.com/wxorder/miao/confirmorder';
		if(type == 'detail') {
			url = 'https://w.midea.com/detail/index';
			presell_url = 'https://w.midea.com/detail/index/sale';
			seckill_url = 'https://w.midea.com/detail/index/miao';
		}
		var sellerId = parseInt(URL.getUrlParam('sellerid', location.href), 10);
		sellerId = isNaN(sellerId) ? 0 : sellerId;
		url_para += '&sellerid=' + sellerId;
		url_para += '&itemid=' + window.strFiid;
		if(nFlag && (nFlag == 1)) {
			location.href = encodeURI(presell_url + url_para);
		} else if(nFlag && (nFlag == 2)) {
			location.href = encodeURI(seckill_url + url_para);
		} else {
			location.href = encodeURI(url + url_para);
		}
	}

	function initSku() {
		var classDisabled = 'option_nosku',
			classSelected = 'option_selected',
			classOption = 'option',
			skuWrapSelector = '#skuWrap',
			colorSelector = '#skuColor',
			specSelector = '#skuSpec';
		var skuMap = {
			'color': {},
			'spec': {}
		};
		if(nFlag == 0) {
			if(nState == 1) {
				$('#btnBuy').addClass('btn_buy_disabled');
				$('#divEditNum').addClass('num_wrap_disabled');
			}
		}
		if(strSpec) {
			$(colorSelector).find('.' + classOption).each(function() {
				if($(this).text() == strSpec.colorName) {
					$(this).addClass(classSelected).siblings().removeClass(classSelected);
				}
			});
			$(specSelector).find('.' + classOption).each(function() {
				if($(this).text() == strSpec.specName) {
					$(this).addClass(classSelected).siblings().removeClass(classSelected);
				}
			});
		}
		$.each(oItemSkuInfo.mapwxskuinfo, function(index, item) {
			var curSpec = JSON.parse(item.strSpec);
			if(!skuMap.color[curSpec.colorName]) {
				skuMap.color[curSpec.colorName] = [{
					'name': curSpec.specName,
					'stock': item.nCalStock
				}];
			} else {
				for(var i = 0; i < skuMap.color[curSpec.colorName].length; i++) {
					if(skuMap.color[curSpec.colorName][i] == curSpec.specName) {
						return false;
					}
				}
				skuMap.color[curSpec.colorName].push({
					'name': curSpec.specName,
					'stock': item.nCalStock
				});
			}
			$.each(oItemSkuInfo.mapwxskuinfo, function(index, item) {
				var curSpec = JSON.parse(item.strSpec);
				if(!skuMap.spec[curSpec.specName]) {
					skuMap.spec[curSpec.specName] = [{
						'name': curSpec.colorName,
						'stock': item.nCalStock
					}];
				} else {
					for(var i = 0; i < skuMap.spec[curSpec.specName].length; i++) {
						if(skuMap.spec[curSpec.specName][i] == curSpec.colorName) {
							return false;
						}
					}
					skuMap.spec[curSpec.specName].push({
						'name': curSpec.colorName,
						'stock': item.nCalStock
					});
				}
			});
		});
		$(skuWrapSelector).find('.' + classOption).on(eventType, function() {
			countMtag($(this));
			if($(this).hasClass(classSelected)) {
				return;
			}
			$(this).addClass(classSelected).siblings().removeClass(classSelected);
			var colorText = $(colorSelector).find('.' + classSelected).text();
			var specText = $(specSelector).find('.' + classSelected).text();
			var specFlag = false;
			$.each(oItemSkuInfo.mapwxskuinfo, function(index, item) {
				if(colorText == JSON.parse(item.strSpec).colorName && specText == JSON.parse(item.strSpec).specName) {
					var item_id = item.strFiid;
					specFlag = true;
					if(lDisSkuId == index) {
						location.reload();
					} else {
						location.href = location.href.replace(/(\?|&)id\=\d+(.*)/ig, '$1id=' + index + '$2').replace(/(\?|&)itemid\=\d+(.*)/ig, '$1itemid=' + item_id + '$2');
					}
				}
			});
			if(!specFlag) {
				var $btnBuy = $('#btnBuy'),
					$btnAlarm = $('#btnAlarm');
				$(".btn_cart").remove();
				$(".alarm_tip").removeClass('show').addClass('hide');
				$(".btn_buy").off('click').addClass('btn_buy_disabled').html('商品已被抢光，看看别的吧');
				$('#divEditNum').addClass('num_wrap_disabled');
				$('#minus, #plus').off(eventType);
				$('#stockNum').text('0');
				$('.J_stock_state').html('无货');
				clearInterval(window.activeTimer);
				$btnBuy.attr('is-buy', 2);
				$('.stock_right').addClass('stock_none');
			}
		});
		var $itemPrice = $('#itemPrice'),
			$price = $itemPrice.find('.price span'),
			$oldPrice = $itemPrice.find('.old_price span');
		if(($oldPrice.text() - 0) < ($price.text() - 0)) {
			$oldPrice.text($price.text());
		}
	}

	function initEditNum() {
		oBuyInfo[nSkuid] = {
			"skuid": nSkuid,
			"buynum": nBuyNum
		};
		editCmdtyNum({
			strEditDivId: 'divEditNum',
			nInitNum: nBuyNum,
			nMinNum: 1,
			nMaxNum: (nQuotaNum && (nQuotaNum < nCalStock)) ? nQuotaNum : nCalStock,
			afterEdit: function(nNum) {
				oBuyInfo[nSkuid].buynum = nNum;
			}
		});
	}

	function editCmdtyNum(oConf) {
		var plus = '#plus',
			minus = '#minus',
			plus_disabled = 'plus_disabled',
			minus_disabled = 'minus_disabled';
		var _oConf = $.extend({
				strEditDivId: '',
				nInitNum: 0,
				nMaxNum: 0,
				nMinNum: 0,
				afterEdit: function(nNum) {}
			}, oConf),
			oEditDiv = $('#' + _oConf.strEditDivId),
			oNumTxt = oEditDiv.find('.num');
		$(minus).addClass('minus_disabled');
		if(_oConf.nMaxNum <= 1) {
			$(plus).addClass('plus_disabled');
		}
		oNumTxt.val(_oConf.nInitNum);

		function editNum(nNewNum) {
			if(nNewNum <= _oConf.nMaxNum && nNewNum >= _oConf.nMinNum) {
				oNumTxt.val(nNewNum);
				if(oConf.nMaxNum == _oConf.nMinNum) {
					$(plus).addClass(plus_disabled);
					$(minus).addClass(minus_disabled);
				} else {
					if(nNewNum == _oConf.nMaxNum) {
						$(plus).addClass(plus_disabled);
						$(minus).removeClass(minus_disabled);
					} else if(nNewNum == _oConf.nMinNum) {
						$(plus).removeClass(plus_disabled);
						$(minus).addClass(minus_disabled);
					} else {
						$(plus).removeClass(plus_disabled);
						$(minus).removeClass(minus_disabled);
					}
				}
				return true;
			} else {
				if(oConf.nMaxNum == _oConf.nMinNum) {
					$(plus).addClass(plus_disabled);
					$(minus).addClass(minus_disabled);
				} else {
					if(nNewNum >= _oConf.nMaxNum) {
						$(plus).addClass(plus_disabled);
						$(minus).removeClass(minus_disabled);
					} else if(nNewNum <= _oConf.nMinNum) {
						$(plus).removeClass(plus_disabled);
						$(minus).addClass(minus_disabled);
					}
				}
				return false;
			}
		}

		function addNum() {
			var nNewNum = oNumTxt.val() * 1 + 1;
			return editNum(nNewNum);
		}

		function delNum() {
			var nNewNum = oNumTxt.val() * 1 - 1;
			return editNum(nNewNum);
		}

		function focusNumTxt() {
			oNumTxt.attr('cacheNum', oNumTxt.val());
		}

		function blurNumTxt() {
			var nNewNum = oNumTxt.val() * 1;
			if(!editNum(nNewNum)) {
				oNumTxt.val(_oConf.nMaxNum);
			} else {
				_oConf.afterEdit(oNumTxt.val());
			}
		}

		function init() {
			oEditDiv.click(function(e) {
				var oTarget = e.target;
				switch(oTarget.className) {
					case 'minus':
						if(delNum()) {
							_oConf.afterEdit(oNumTxt.val());
							countMtag($(this));
						}
						break;
					case 'plus':
						if(addNum()) {
							_oConf.afterEdit(oNumTxt.val());
							countMtag($(this));
						}
						break;
				}
			});
			oNumTxt.focus(focusNumTxt).blur(blurNumTxt);
		}
		init();
	}

	function initAddr() {
		var addr_code = cookie.get('addr_code') || "";
		var addr_array = addr_code.split(',');
		var valid = true;
		if(addr_array.length != 3) {
			valid = false;
		} else {
			for(var i = 0; i < 3; i++) {
				if(addr_array[i] == '') {
					valid = false;
				}
			}
		}
		if(!addr_code || !valid) {
			getLocation(function(addrObj) {
				if(bbcDistrictData) {
					var address = [addrObj.province, addrObj.city, addrObj.district].join(',');
					var code = string2Code(address, bbcDistrictData);
					if(code && code.split(',').length == 3) {
						cookie.setC('addr_code', code, 60 * 24 * 7, '/', '.midea.com');
						var ofnType = parseInt(URL.getUrlParam('ofn_type', location.href), 10);
						var params = '';
						if(ofnType) {
							params = '?id=' + nSkuid + '&addr_code=' + code + '&ofn_type=' + ofnType;
						} else {
							params = '?id=' + nSkuid + '&addr_code=' + code;
						}
						commonJump(params, 'detail');
					} else {
						cookie.del('addr_code', '', '.w.midea.com');
						cookie.del('addr_text', '', '.w.midea.com');
						cookie.del('addr_code', '', 'w.midea.com');
						cookie.del('addr_text', '', 'w.midea.com');
						cookie.del('addr_code', '', '.midea.com');
						cookie.del('addr_text', '', '.midea.com');
					}
				}
			});
		}
		if(nState != 1) {
			$('#addrTrigger').mmdAddress({
				success: function(data) {
					cookie.del('addr_code', '', 'w.midea.com');
					cookie.del('addr_text', '', 'w.midea.com');
					cookie.del('addr_code', '', '.w.midea.com');
					cookie.del('addr_text', '', '.w.midea.com');
					cookie.setC('addr_code', data.areaCode, 60 * 24 * 7, '/', '.midea.com');
					report.rd({
						'mtag': '30008.4.1'
					});
					var ofnType = parseInt(URL.getUrlParam('ofn_type', location.href), 10);
					var params = '';
					if(ofnType) {
						params = '?id=' + nSkuid + '&addr_code=' + data.areaCode + '&ofn_type=' + ofnType;
					} else {
						params = '?id=' + nSkuid + '&addr_code=' + data.areaCode;
					}
					commonJump(params, 'detail');
				}
			});
		}
	}

	function string2Code(address, data) {
		var retCode, separator = ',',
			addrObj = address.split(separator),
			tempData, defaultCode = '',
			flag1 = 0;
		for(var code_1 in data) {
			if(data[code_1] instanceof Array && data[code_1] && data[code_1][0] == addrObj[0]) {
				flag1 = 1;
				retCode = code_1 + separator;
				tempData = data[code_1][1];
				if(typeof tempData == 'object') {
					var flag2 = 0;
					for(var code_2 in tempData) {
						if(tempData[code_2] instanceof Array && tempData[code_2] && tempData[code_2][0] == addrObj[1]) {
							flag2 = 1;
							retCode += code_2 + separator;
							tempData = data[code_1][1][code_2][1];
							if(typeof tempData == 'object') {
								var flag3 = 0;
								for(var code_3 in tempData) {
									if(tempData[code_3] == addrObj[2]) {
										flag3 = 1;
										retCode += code_3;
										defaultCode = '';
									}
								}
								if(flag3 == 0) {
									return false;
								}
							}
						}
					}
					if(flag2 == 0) {
						return false;
					}
				}
			}
		}
		if(flag1 == 0) {
			return false;
		}
		return retCode;
	}

	function getLocation(callback) {
		if(navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((function() {
				return function(position) {
					getPositionSuccess(position, callback);
				}
			})(callback), getPositionError, {
				timeout: 5000
			});
		} else {}
	}

	function getPositionSuccess(position, callback) {
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		var gc = new BMap.Geocoder();
		var point = new BMap.Point(lng, lat);
		gc.getLocation(point, function(rs) {
			var addComp = rs.addressComponents;
			if(callback && typeof callback == 'function') {
				callback(addComp);
			}
		});
	}

	function getPositionError(error) {
		switch(error.code) {
			case error.TIMEOUT:
				break;
			case error.PERMISSION_DENIED:
				break;
			case error.POSITION_UNAVAILABLE:
				break;
		}
	}

	function getHash() {
		var pageTypeHash = window.location.hash.replace('#', '');
		var pageType = 'product';
		if(pageTypeHash) {
			if(pageTypeHash.indexOf('detail') >= 0) {
				pageType = 'detail';
			} else if(pageTypeHash.indexOf('evaluate') >= 0) {
				pageType = 'evaluate';
			}
		}
		return pageType;
	}

	function handleHead() {
		if(window.history.length > 1) {
			$("#backChildBtn").removeClass("hide");
		}
		var pageTypeHash = window.location.hash.replace('#', '');
		if(pageTypeHash) {
			var pageType = 'product';
			if(pageTypeHash.indexOf('detail') >= 0) {
				pageType = 'detail';
				syncDetailPic();
			} else if(pageTypeHash.indexOf('evaluate') >= 0) {
				pageType = 'evaluate';
				if(commentCount) {
					initComment();
					initLike();
				}
			}
			$(".J_switch_header,.J_main_wrap").removeClass('cur_product cur_detail cur_evaluate').addClass('cur_' + pageType);
		} else {
			$(".J_switch_header,.J_main_wrap").removeClass('cur_product cur_detail cur_evaluate').addClass('cur_product');
		}
		if(document.all) {
			window.attachEvent('hashchange', function() {
				var pageType = getHash();
				$(".J_switch_header,.J_main_wrap").removeClass('cur_product cur_detail cur_evaluate').addClass('cur_' + pageType);
			});
		} else {
			window.addEventListener('hashchange', function() {
				var pageType = getHash();
				$(".J_switch_header,.J_main_wrap").removeClass('cur_product cur_detail cur_evaluate').addClass('cur_' + pageType);
			}, false);
		}
		$('#backChildBtn').on(eventType, function() {
			window.history.back();
		});
		$('.J_header_status').on(eventType, function() {
			countMtag($(this));
			var pageType = $(this).attr('data-type');
			if(pageType == 'evaluate' && commentCount) {
				initComment();
				initLike();
			} else if(pageType == 'detail') {
				syncDetailPic();
			}
			window.scrollTo(0, 0);
		});
		$('.J_to_detail').on(eventType, function() {
			countMtag($(this));
			syncDetailPic();
			$(".J_switch_header,.J_main_wrap").removeClass('cur_product cur_detail cur_evaluate').addClass('cur_detail');
			window.scrollTo(0, 0);
			$("#headWrap").removeClass('header_disabled');
		});
		$('.J_to_evaluate').on(eventType, function() {
			countMtag($(this));
			$(".J_switch_header,.J_main_wrap").removeClass('cur_product cur_detail cur_evaluate').addClass('cur_evaluate');
			window.scrollTo(0, 0);
			$("#headWrap").removeClass('header_disabled');
			if(commentCount) {
				initComment();
				initLike();
			}
		});
		var yStart = 0,
			yEnd = 0,
			headerTimer;
		$(document).on('touchstart', function(e) {
			var touch = e.touches[0];
			yStart = touch.pageY;
		}).on('touchmove', function(e) {
			var windowTop = $(window).scrollTop();
			var touch = e.touches[0];
			yEnd = touch.pageY;
			if(yEnd > yStart) {
				$("#headWrap").removeClass('header_disabled');
			} else if(yEnd < yStart && windowTop > 50) {
				$("#headWrap").addClass('header_disabled');
			}
		}).on('touchend', function(e) {});
		$(window).on('scroll', function() {
			var windowTop = $(window).scrollTop();
			if(windowTop < 50) {
				$("#headWrap").removeClass('header_disabled');
			}
		})
	}

	function handleSlider() {
		var mySwiper = new Swiper('.swiper-container', {
			loop: true,
			pagination: '.swiper-pagination',
			paginationClickable: true
		});
	}

	function handleSwitch() {
		$('.J_param').on(eventType, function() {
			var dataType = $(this).attr('data-type');
			if(dataType == 'service') {
				var servicePic = $('#servicePic').find('img');
				for(var i = 0; i < servicePic.length; i++) {
					servicePic.eq(i).attr('src', servicePic.eq(i).attr('init_src'));
				}
			}
			countMtag($(this));
			$(this).toggleClass('detail_off');
		})
	}

	function initPicView() {
		var allImgs = $('.detail_img');
		allImgs.on('click', function() {
			var regExp = /_50\.(jpg|png|jpeg|bmp)/ig,
				curImg = $(this).attr("init_src");
			curImg = curImg.replace(regExp, '_90.$1');
			if(wx) {
				wx.previewImage({
					current: curImg,
					urls: vecPicInfo['vecDetailInfoList90']
				});
			}
		});
		$('#bannerList').find('img').on('click', function() {
			countMtag($(this));
			var regExp = /_50\.(jpg|png|jpeg|bmp)/ig,
				curImg = $(this).attr("src");
			curImg = curImg.replace(regExp, '_90.$1');
			if(wx) {
				wx.previewImage({
					current: curImg,
					urls: vecPicInfo['vecPicInfoList90']
				});
			}
		});
	}

	function initView() {
		var allImgs = $('.small_img');
		allImgs.live('click', function() {
			var oImgs = $(this).parent().parent().find("img"),
				aImgs = [],
				curImg = $(this).attr("src");
			oImgs.each(function() {
				aImgs.push($(this).attr("src"));
			});
			viewPic(aImgs, curImg);
		});
	}

	function viewPic(aImgs, curImg) {
		mPreviewImage.preview(aImgs, curImg);
	}

	function initBuy() {
		var sellerId = parseInt(URL.getUrlParam('sellerid', location.href), 10);
		$('#btnBuy,#btnBuyOfn').on(eventType, function(e) {
			e.preventDefault();
			var $this = $(this);
			buyProduct($this, sellerId);
		});
	}

	function buyProduct($this, sellerId) {
		countMtag($this);
		if(nCalStock == 0 || nState == 1) {
			return;
		}
		if(nFlag && (nFlag == 2)) {
			var isBuy = $("#btnBuy").attr("is-buy"),
				now = new Date().getTime(),
				killStartDate = (activeInfo['activeStartTime'] * 1000 - now - delta);
			if((typeof(isBuy) != undefined && (isBuy == 2)) || (killStartDate > (60 * 30 * 1000))) {
				return;
			}
		}
		if(isQyh) {}
		var buyNum = $('#num').val() - 0;
		if(typeof nQuotaNum != 'undefined' && buyNum > nQuotaNum && nQuotaNum) {
			alert("您已超过限购数量" + nQuotaNum + "件，不能继续购买");
			$('#num').val(nQuotaNum);
			return;
		}
		var addr_code = URL.getUrlParam('addr_code');
		if(!addr_code) {
			addr_code = cookie.get('addr_code');
		}
		var regsrc = '20.20006.20006010';
		if(lDisId == 100511) {
			regsrc = '20.20005.20005010';
		}
		var ofnType = URL.getUrlParam('ofn_type');
		var params = '?skuid=' + lDisSkuId +
			'&buynum=' + buyNum +
			'&disid=' + lDisId +
			'&icid=' + lSkuid +
			'&addr_code=' + (addr_code ? addr_code : 0) +
			'&regsrc=' + regsrc;
		if($this.hasClass('btn_ofn') && ofnType) {
			params = '?skuid=' + lDisSkuId +
				'&buynum=' + buyNum +
				'&disid=' + lDisId +
				'&icid=' + lSkuid +
				'&addr_code=' + (addr_code ? addr_code : 0) +
				'&ofn_type=' + ofnType +
				'&regsrc=' + regsrc;
		}
		commonJump(params, 'buy');
	}

	function initCollect() {
		if(cookie.getC('uid')) {
			isCollect();
			if((cookie.getC('flag_detail_collect') == window.strFiid)) {
				cookie.del('flag_detail_collect', '', 'w.midea.com');
				addCollect();
			}
		}
		$('.J_collect').on(eventType, function() {
			countMtag($(this));
			if(cookie.getC('uid')) {
				if($(this).hasClass('collect_success')) {
					deleteCollect();
				} else {
					addCollect();
				}
			} else {
				cookie.setC('flag_detail_collect', window.strFiid.toString(), 60 * 24 * 7, '/', 'w.midea.com');
				location.href = "https://w.midea.com/mlogin/check_user?rurl=" + encodeURIComponent(location.href);
			}
		});
	}

	function isCollect() {
		$.ajax({
			type: "GET",
			url: "//w.midea.com/my/collect/is_collected",
			dataType: "json",
			data: {
				dis_sku_id: lDisSkuId,
				itemid: window.strFiid
			},
			success: function(response) {
				if(response.errcode == 0) {
					_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/is_collected[成功]', 1]);
					if(response.isncollected == 1) {
						$('.J_collect').addClass("collect_success");
					}
				} else {
					_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/is_collected[逻辑错误]', 1]);
				}
			},
			error: function(request) {
				_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/is_collected[系统错误]', 1]);
			}
		});
	}

	function addCollect() {
		$.ajax({
			type: "GET",
			url: "//w.midea.com/my/collect/add_collect",
			dataType: "json",
			data: {
				dis_sku_id: lDisSkuId,
				itemid: window.strFiid
			},
			success: function(response) {
				if(response.errcode == 0) {
					_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/add_collect[成功]', 1]);
					$('.J_collect').addClass('collect_success');
					oCollect.setContent('添加收藏成功').show();
					if(window.nFlag != 1 && window.nFlag != 2) {
						$.ajax({
							type: "GET",
							url: "//w.midea.com/next/itemabout/pricecutnotify",
							dataType: "json",
							data: {
								itemid: window.strFiid,
								areacode: window.addrCode,
							}
						});
					}
				} else {
					_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/add_collect[逻辑错误]', 1]);
					if(response.errcode == "539299862" || response.errcode == "539299865" || response.errcode == "539299861") {
						location.href = "https://w.midea.com/mlogin/check_user?rurl=" + encodeURIComponent(location.href);
					} else {
						oFail.setContent(response.errmsg).show();
					}
				}
			},
			error: function() {
				oFail.setContent('系统繁忙，请稍后再试').show();
				_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/add_collect[系统错误]', 1]);
			}
		});
	}

	function deleteCollect() {
		$.ajax({
			type: "GET",
			url: "//w.midea.com/my/collect/delete_collect",
			dataType: "json",
			data: {
				dis_sku_id: lDisSkuId,
				itemid: window.strFiid
			},
			error: function(request) {
				oFail.setContent('系统繁忙，请稍后再试').show();
				_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/delete_collect[系统错误]', 1]);
			},
			success: function(response) {
				if(response.errcode == 0) {
					_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/delete_collect[成功]', 1]);
					$('.J_collect').removeClass('collect_success');
				} else {
					_hmt.push(['_trackEvent', 'mmd', 'ajax', '/my/collect/delete_collect[逻辑错误]', 1]);
					if(response.errcode == "539299862" || response.errcode == "539299865" || response.errcode == "539299861") {
						location.href = "https://w.midea.com/mlogin/check_user?rurl=" + encodeURIComponent(location.href);
					} else {
						oFail.setContent(response.errmsg).show();
					}
				}
			}
		});
	}

	function initTimer() {
		var oTime = $("#intervalTime");
		var now = new Date().getTime();
		var date3;
		date3 = (activeInfo['activeEndTime'] * 1000 - now - delta);
		var aTime = intervalTime(date3);
		if(date3 <= 0) {
			clearInterval(window.activeTimer);
			oTime.html("当前活动已结束，最新价格请<a href='#' onclick='location.reload();' style='color: blue'>刷新页面</a>查看");
		} else {
			oTime.html(aTime[0] + "天" + aTime[1] + "小时" + aTime[2] + "分" + aTime[3] + "秒后活动结束");
		}
	}

	function initPreTimer() {
		var oPreSaleTime = $("#intervalPreTime");
		var now = new Date().getTime();
		var preDate;
		preDate = (activeInfo['activePreEndTime'] * 1000 - now - delta);
		var aPreTime = intervalTime(preDate);
		if(preDate <= 0) {
			clearInterval(window.activeTimer);
			$("#btnBuy").removeClass("btn_buy_pre").addClass("btn_buy_disabled").html("预定结束");
		} else {
			oPreSaleTime.html('还剩' + aPreTime[0] + "天" + aPreTime[1] + "小时" + aPreTime[2] + "分" + aPreTime[3] + "秒");
		}
	}

	function initKillTimer() {
		var oKillTime = $('#intervalKillTime'),
			floorHinter = $('.alarm_tip');
		var now = new Date().getTime();
		var killEndDate = (activeInfo['activeEndTime'] * 1000 - now - delta);
		var killStartDate = (activeInfo['activeStartTime'] * 1000 - now - delta);
		var aKillTime = intervalTime(killStartDate);
		if(killEndDate <= 0) {
			$('.btn_buy').html('抢光了').addClass('btn_buy_disabled');
			clearInterval(window.activeTimer);
		} else {
			if(killStartDate > 0) {
				if(killStartDate <= (60 * 30 * 1000)) {
					$("#btnBuy").attr('is-buy', '1');
					$('.btn_buy').removeClass('btn_buy_disabled');
					floorHinter.removeClass('alarm_tip_seckill_off').addClass('alarm_tip_seckill_ready');
				}
				oKillTime.find('#killTimeH').html(aKillTime[1]);
				oKillTime.find('#killTimeM').html(aKillTime[2]);
				oKillTime.find('#killTimeS').html(aKillTime[3]);
			} else {
				if(activeInfo['activeStatus'] == 2) {
					$('.btn_buy').html('去秒杀');
					floorHinter.removeClass('alarm_tip_seckill_ready').addClass('alarm_tip_seckill_ing');
				}
				clearInterval(window.activeTimer);
			}
		}
	}

	function intervalTime(date3, type) {
		var days = Math.floor(date3 / (24 * 3600 * 1000));
		if(days < 10) {
			days = '0' + days;
		}
		var leave1 = date3 % (24 * 3600 * 1000);
		var hours = Math.floor(leave1 / (3600 * 1000));
		if(hours < 10) {
			hours = '0' + hours;
		}
		var leave2 = leave1 % (3600 * 1000);
		var minutes = Math.floor(leave2 / (60 * 1000));
		if(minutes < 10) {
			minutes = '0' + minutes;
		}
		var leave3 = leave2 % (60 * 1000);
		var seconds = Math.round(leave3 / 1000);
		if(seconds < 10) {
			seconds = '0' + seconds;
		}
		return [days, hours, minutes, seconds];
	}

	function handleShare() {
		initCode();
		$('#detailShare').on(eventType, function() {
			countMtag($(this));
			$('.J_share').addClass("share_wrap_show");
			$('#layerCover').show();
		});
		$('.J_cancel_share').on(eventType, function() {
			$('.J_share').removeClass("share_wrap_show");
			$('#layerCover').hide();
			$("#headWrap").removeClass('header_disabled');
		});
		$('.J_show_code').on(eventType, function(e) {
			$("#layerQrcode").toggleClass("mod_layer_show");
			$("#layerCover").show();
			$('.J_share').removeClass("share_wrap_show");
			e.stopPropagation();
		});
		$('#layerQrcode, #layerCover').on(eventType, function(e) {
			$("#layerQrcode").removeClass("mod_layer_show");
			$("#layerCover").hide();
			$('.J_share').removeClass("share_wrap_show");
			e.stopPropagation();
		});
	}

	function initCode() {
		var qr = new QRcode(document.getElementById("qrcode"), {
			width: 180,
			height: 180
		});
		qr.makeCode(window.location.href);
	}

	function initComment() {
		$.ajax({
			type: 'POST',
			data: {
				'skuId': lSkuid
			},
			url: '//w.midea.com/detail/comment/get_tag_list',
			dataType: 'json',
			success: function(data) {
				if(data.errcode == 0 && data.list) {
					$('#tagBox').removeClass('hide');
					$('#tagList').html(formatJson.render($('#tagsTemp').html(), {
						data: data.list
					}));
				}
			},
			error: function() {}
		});
		var oCommonList = mCommonlist.init({
			domId: mCommonlistDomId,
			reqUrl: '//w.midea.com/detail/index/get_detail_comment',
			params: {
				'skuId': lDisSkuId
			},
			pageno: 1,
			startPageno: 1,
			itemTag: 'div',
			pagesize: 10,
			emptyMsg: '没有更多的评价！',
			disableCache: false,
			success: function(obj, callback) {
				if(obj.pageno == 1) {
					var totalScore = (obj.score / 500) * 122 + 'px';
					$("#scoreBox").css("width", totalScore);
				}
				callback(obj.data, obj.total);
			}
		});
	}

	function initLike() {
		$('.main_wrap ').delegate(".J_comment_like", eventType, function() {
			var $this = $(this);
			var sMac = cookie.get('midea_mk'),
				icid = lSkuid,
				commentId = $this.attr("commentId"),
				userId = $this.attr("userId");
			$.ajax({
				type: 'POST',
				data: {
					'commentId': commentId,
					'mac': sMac,
					'skuId': icid,
					'userId': userId
				},
				url: '//w.midea.com/detail/comment/point_praise',
				dataType: 'json',
				success: function(data) {
					if(data.errcode == 0) {
						if(data.data == 0) {
							var oRateCount = $this.find(".evaluate_count");
							oRateCount.html(parseInt(oRateCount.attr("rateCount")) + 1);
							$this.addClass("already_praise");
						} else if(data.data == 1 || data.data == 2) {
							oWarn.setContent('不可重复点赞！').show();
							$this.addClass("already_praise");
						} else {
							oFail.setContent('系统繁忙，请稍后再试').show();
						}
						_hmt.push(['_trackEvent', 'mmd', 'ajax', '/detail/comment/point_praise[成功]', 1]);
					} else {
						oFail.setContent('系统繁忙，请稍后再试').show();
						_hmt.push(['_trackEvent', 'mmd', 'ajax', '/detail/comment/point_praise[逻辑错误]', 1]);
					}
				},
				error: function() {
					oFail.setContent('系统繁忙，请稍后再试').show();
					_hmt.push(['_trackEvent', 'mmd', 'ajax', '/detail/comment/point_praise[系统错误]', 1]);
				}
			});
		});
	}

	function initLayer() {
		var opt = {
			type: 'loading',
			content: '',
			icoType: '',
			onConfirm: function(data) {}
		};
		var opt2 = {
			type: 'info',
			content: '',
			icoType: 'right',
			autoClose: 2000,
			onConfirm: function(data) {}
		};
		var opt3 = {
			type: 'info',
			content: '',
			icoType: 'warn',
			icoTypeGroup: [{
				type: 'right',
				tpl: '<i class="mod_tips_ico mod_tips_ico_right"></i>'
			}, {
				type: 'error',
				tpl: '<i class="mod_tips_ico mod_tips_ico_error"></i>'
			}, {
				type: 'warn',
				tpl: '<i class="mod_tips_ico mod_ico_info_b"></i>'
			}, ],
			autoClose: 2000,
			onConfirm: function(data) {}
		};
		var opt4 = {
			type: 'info',
			content: '',
			icoType: 'error',
			autoClose: 2000,
			onConfirm: function(data) {}
		};
		var opt5 = {
			type: 'info',
			content: '',
			icoType: 'warn',
			icoTypeGroup: [{
				type: 'right',
				tpl: '<i class="mod_tips_ico mod_tips_ico_right"></i>'
			}, {
				type: 'error',
				tpl: '<i class="mod_tips_ico mod_tips_ico_error"></i>'
			}, {
				type: 'warn',
				tpl: '<i class="mod_tips_ico mod_ico_info_collect"></i>'
			}, ],
			autoClose: 2000,
			onConfirm: function(data) {}
		};
		if(location.href.indexOf('appview') != -1 || location.href.indexOf('midea_home') != -1) {
			opt['setClass'] = 'no_transform';
			opt2['setClass'] = 'no_transform';
			opt3['setClass'] = 'no_transform';
			opt4['setClass'] = 'no_transform';
			opt5['setClass'] = 'no_transform';
		}
		oLoad = $.mpopup(opt);
		oSuccess = $.mpopup(opt2);
		oWarn = $.mpopup(opt3);
		oFail = $.mpopup(opt4);
		oCollect = $.mpopup(opt5);
	}

	function initDetailPic() {
		var detailPicFirst = $('#detailImageWrap').find('.detail_img').eq(0);
		detailPicFirst.attr('src', detailPicFirst.attr('init_src'));
	}

	function syncDetailPic() {
		if(isDetailPic) {
			var detailPic = $('#detailImageWrap').find('.detail_img');
			for(var i = 1; i < detailPic.length; i++) {
				detailPic.eq(i).attr('src', detailPic.eq(i).attr('init_src'));
			}
			isDetailPic = false;
		}
	}

	function initHeadSlider() {
		handleHead();
		handleSlider();
		handleSwitch();
		initPicView();
		initView();
	}

	function initOthers() {
		handleShare();
		$('.js_switch_promo').on('click', function() {
			$('.js_promotion').toggleClass('promotion_on');
		})
	}

	function countMtag(dom) {
		var mtag = dom.attr('mtag');
		if(mtag) {
			report.rd({
				'mtag': mtag
			});
		}
	}

	function overEllipsis() {
		$(".normal_product_list .name").each(function(i) {
			var divH = $(this).height();
			var $p = $("p", $(this)).eq(0);
			while($p.height() > divH) {
				$p.text($p.text().replace(/(\s)*([a-zA-Z0-9]+|\W)(\.\.\.)?$/, "..."));
			};
		});
	}

	function initAlarm() {
		$('#btnAlarm').on('click', function(e) {
			e.preventDefault();
			bindAlarm();
		});
	}

	function bindAlarm() {
		var sellerId = parseInt(URL.getUrlParam('sellerid', location.href), 10);
		sellerId = isNaN(sellerId) ? 0 : sellerId;
		var alarm_tip = $('.alarm_tip');
		var addrCode = alarm_tip.attr("addr-code") || "440000,440100,440106";
		var skuId = lDisSkuId;
		var addrText = alarm_tip.attr("addr-text") || '广东省-广州市-天河区',
			itemTitle = $('.item_title').attr("title") || '热销商品';
		var nUrl = location.href;
		var rUrl = 'https://w.midea.com/detail/index/add_stock_register?skuId=' + skuId + '&sellerId=' + sellerId + '&addrCode=' + addrCode + '&addrText=' + addrText + '&itemTitle=' + itemTitle + '&nUrl=' + encodeURIComponent(nUrl) + '&distributorId=' + lDisId;
		if(cookie.getC('uid')) {
			location.href = rUrl;
		} else {
			location.href = "https://w.midea.com/mlogin/check_user?rurl=" + encodeURIComponent(rUrl);
		}
	}

	function commonPop(arr, type) {
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
					tpl: '<a  class="mod_popup_btn ' + arr[2] + '" href="javascript:void(0)" data-mpopup-close>' + arr[1] + '</a>'
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
	}

	function cartPop(type, errmsg) {
		var arrPop = [],
			popType = 2;
		var failMsg = errmsg || '服务异常，建议刷新';
		switch(type) {
			case 'addSuccess':
				arrPop = ['添加成功！', '继续购物', '', '去结算', 'js_to_cart'];
				break;
			case 'commonFail':
				arrPop = [failMsg, '取消', '', '确认刷新', 'js_pop_reload'];
				break;
			case 'addCartFail':
				arrPop = [failMsg, '刷新', 'js_pop_reload'];
				popType = 3;
				break;
			case 'overMax':
				arrPop = ['添加失败！' + failMsg, '整理购物车', 'js_to_cart', '取消', ''];
				break;
			case 'networkFail':
				arrPop = ['请刷新重试', '取消', '', '确认刷新', 'js_pop_reload'];
				break;
			default:
				arrPop = ['请刷新重试'];
				window.setTimeout(function() {
					window.location.href = updateUrl(location.href);
				}, 2000);
				popType = 1;
		}
		commonPop(arrPop, popType);
	}

	function getCartNum() {
		var $cartNum = $("#cartNum");
		$.ajax({
			type: "POST",
			dataType: "json",
			url: "//w.midea.com/my/index/ajax_index_cart_num",
			success: function(data) {
				if(data.errcode == 0) {
					var cartSum = data.data.nCount;
					if(typeof(cartSum) != "undefined" && cartSum > 0) {
						$cartNum.show();
						$cartNum.html(cartSum);
					}
				}
			},
			error: function(data) {}
		});
	}

	function initCart() {
		getCartNum();
		var cartUnloginFlag = cookie.getC('flag_detail_h5_cart');
		if(cookie.getC('uid') && cartUnloginFlag == window.strFiid) {
			addCart();
			cookie.del('flag_detail_h5_cart', '', 'w.midea.com');
		}
		$("#btnBuyCart").on('click', function() {
			if(cookie.getC('uid')) {
				addCart();
			} else {
				location.href = "//w.midea.com/mlogin/check_user?rurl=" + encodeURIComponent(location.href);
				cookie.setC('flag_detail_h5_cart', window.strFiid.toString(), 60 * 24 * 7, '/', 'w.midea.com');
			}
		});
		$(document).on('click', ".js_to_cart", function() {
			location.href = "//w.midea.com/cart?fsid=" + window.strFsid;
		});
		$(document).on('click', ".js_to_lottery", function() {
			location.href = "//event.midea.com/act/lottery_1111";
		});
		$(document).on('click', ".js_pop_reload", function() {
			location.href = updateUrl(location.href);
		});
	}

	function addCart() {
		var cartSkuNum = parseInt($("#num").val());
		var serllerId = URL.getUrlParam('sellerid', location.href);
		var cartData = {
			sku_id: parseInt(lDisSkuId),
			num: cartSkuNum,
			sellerid: serllerId ? parseInt(serllerId, 10) : 0
		};
		if(window.strFiid) {
			cartData['itemid'] = window.strFiid;
		}
		$.ajax({
			type: "POST",
			url: "//w.midea.com/cart/index/ajax_add_item",
			dataType: "json",
			data: cartData,
			success: function(data) {
				if(data.errcode == 0) {
					getCartNum();
					cartPop("addSuccess");
				} else if(data.errcode == 0x21531004 || data.errcode == 0x21531005 || data.errcode == 0x21531006) {
					cartPop("overMax", data.errmsg);
				} else if(data.errcode == 0x21531001 || data.errcode == 0x21531003) {
					cartPop("addCartFail", data.errmsg);
				} else {
					mError.checkCode(data);
				}
			},
			error: function(data) {
				cartPop("networkFail");
			}
		});
	}

	function updateUrl(url) {
		var sUrl = url;
		if(sUrl.indexOf('?') != -1) {
			sUrl = sUrl + '&t=' + new Date().getTime();
		} else {
			sUrl = sUrl + '?t=' + new Date().getTime();
		}
		return sUrl;
	}

	function modAsideUp() {
		var modAsideUpFlag = $(".alarm_tip").hasClass("show");
		if(modAsideUpFlag) {
			setTimeout(function() {
				$("#asideWrap").addClass("mod_aside_up");
				$(".to_detail").addClass("to_detail_up");
			}, 100);
		}
		var domItemWord = $('.js_item_word');
		var itemWordHeight = $('.js_item_word_inner').height();
		var domWordSwitch = $('.js_item_word_switch');
		if(itemWordHeight > 36) {
			domWordSwitch.addClass('item_word_switch_on');
		}
		domItemWord.on('click', function() {
			domItemWord.toggleClass('item_word_down');
		})
	}

	function initAct() {
		if(nFlag == 2) {
			$("#asideWrap").addClass("mod_aside_up");
			if((activeInfo['activeStatus'] == 2 || activeInfo['activeStatus'] == 3) && (nCalStock > 0)) {
				window.activeTimer = setInterval(function() {
					initKillTimer();
				}, 1000);
			}
		}
		if(nFlag == 0 && activeInfo['activeStatus'] == 3) {
			window.activeTimer = setInterval(function() {
				initTimer();
			}, 1000);
		}
		if(nFlag == 1 && activeInfo['activeStatus'] == 5) {
			window.activeTimer = setInterval(function() {
				initPreTimer();
			}, 1000);
		}
	}
	var packageRecommendObj = function() {
		this.packageActInfo = {};
		this.domPackageList = $('.js_package_list');
		this.domRecommendWrap = $('#recommendWrap');
		this.domRecommendList = $('#recommendList');
		this.domPackagelistList = $('#packagelistWrap');
		this.domPackageTemp = $('#packageTemp');
		this.domRecommendTemp = $('#recommendTemp');
	};
	packageRecommendObj.prototype = {
		init: function() {
			var meObj = this;
			if(window.productInfo.packageFlag) {
				if(window.productInfo.packageFlag) {
					meObj.loadPackage();
				}
			}
			meObj.loadRecommend();
		},
		loadPackage: function() {
			var meObj = this;
			$.ajax({
				type: 'POST',
				url: '//w.midea.com/next/itemabout/itempacklist',
				data: {
					'itemid': window.strFiid
				},
				dataType: 'json',
				success: function(data) {
					if(data.errcode == 0) {
						var renderData = data.data;
						$('#packageNum').html(renderData.Total);
						if(renderData.ItemPackList) {
							var itemPackList = renderData.ItemPackList[0];
							itemPackList.ActivtyTitle = mXss.parse(itemPackList.ActivtyTitle, 'html');
							itemPackList.ActivtyDesc = mXss.parse(itemPackList.ActivtyDesc, 'html');
							var ItemList = itemPackList.ItemList;
							for(var j = 0; j < ItemList.length; j++) {
								ItemList[j].ItemTitle = mXss.parse(ItemList[j].ItemTitle, 'html');
							}
							meObj.domPackageList.html(formatJson.render(meObj.domPackageTemp.html(), {
								data: itemPackList
							}));
							var itemCount = itemPackList.ItemList.length;
							var concatLength = $('.js_concat_wrap').eq(1).width();
							var itemLength = $('.js_item_wrap').width();
							$('.js_package_bottom').width(itemCount * (itemLength + 1) + (itemCount - 1) * concatLength);
						}
					} else {
						meObj.domPackagelistList.remove();
					}
				},
				error: function(data) {
					meObj.domPackagelistList.remove();
				}
			});
		},
		loadRecommend: function() {
			var meObj = this;
			$.ajax({
				type: 'POST',
				url: '//w.midea.com/next/itemabout/itemrecommend',
				data: {
					'itemid': window.strFiid,
					'icid': window.lSkuid,
					'count': 2
				},
				dataType: 'json',
				success: function(data) {
					if(data.errcode == 0) {
						if(data.data.TotalRecords != 0) {
							meObj.domRecommendList.html(formatJson.render(meObj.domRecommendTemp.html(), {
								data: data.data.SkuInfoList
							}));
						} else {
							meObj.domRecommendWrap.remove();
						}
					} else {
						meObj.domRecommendWrap.remove();
					}
				},
				error: function(data) {
					meObj.domRecommendWrap.remove();
				}
			});
		}
	};
	exports.init = function() {
		initLayer();
		initSku();
		initEditNum();
		initAddr();
		initHeadSlider();
		initBuy();
		initAct();
		var packageRecommend = new packageRecommendObj();
		packageRecommend.init();
		initCollect();
		initDetailPic();
		initAlarm();
		initCart();
		modAsideUp();
		initOthers();
	}
});
define('mmd.previewimage', function(require, exports, module) {
	var ua = navigator.userAgent,
		isWX = ua.indexOf('MicroMessenger') > -1;
	exports.preview = function(arrImageUrl, curUrl) {
		if(isWX && window.wx) {
			wx.previewImage({
				current: curUrl || '',
				urls: arrImageUrl
			});
		} else {
			modulejs('swiper.previewImage', function() {
				$.previewImage({
					current: curUrl,
					urls: arrImageUrl
				});
			});
		}
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
define('pullrefresh', function(require, exports, module) {
	var $ = require('zepto');
	var PullRefresh = function(opt) {
		var _opt = $.extend({
				refreshDom: null,
				scrollDom: null,
				tipHeight: 100,
				onRelease: function() {}
			}, opt),
			that = this,
			arrow = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAFsklEQVR4Xu2dO4stRRSFv4uooJEg4uOKBr5CQQMT8QGCYiAGgn9BBFFMBDESAxEEjfQXmIjIBR+BomJgImJg6Pv6AgMx8IGCyoY+OBx65uyu6uqqXbVOMsHsPqdqra/3qq6ZPn0KvYZW4NTQs9fkEQCDQyAABMDgCgw+fXUAATC4AoNPXx1AAAyuwODTVwcQAMMqcBVw4zT7T4FvRlRixA5gxr8E3L1n+BvAQ8DZkUAYDQAz/yPgsmNM/h64BfhuFAhGA+CtmTN/3+szwH0CoD8F7Oz/2jGtf4HTwA+O2vAlI3UAO6tfdzp2L/CmszZ02UgAPAi84nTrAeBVZ23oMgEwb58ACI31/ODVAWZ0UQdQB+jwXFcHcJuqDqAO4IYleqHWAFoD6DJwnwFFgCIgemd3j18RoAhQBCgCfA1DO4E+nUJVKQIUAYoARYCvaSkCfDqFqlIEKAIUAYoAX9NSBPh0ClWlCFAEKAIUAb6mpQjw6RSqShGgCFAEKAJ8TUsR4NMpVJUiQBGgCFAE+JqWIsCnU6gqRYAiQBGgCPA1LUWAT6dQVYoARYAiQBHga1qKAJ9OoaoUAYoARYAiwNe0FAE+nUJVKQIUAYoARYCvaSkCfDqFqlIEKAIUAYoAX9NSBPh0ClWlCFAEKAIUAb6mpQjw6RSqShGgCFAEKAJ8TUsR4NMpVJUiQBGgCFAE+JqWIsCnU6gqRUDFCDgHOB/4vSIykQC4APgT+Ke0XqW/LPpO4EngVuBc4KfpwU1PA7+Untze+7cOwMXAU4CN8xLgL+AD4JnpZxG5SgLwOPAcMPcZ9vy+u4DPi8xq/k1bBuA64B3gypmh23MMHwVeLKFVKQDszLcJnfT+9njWOzaEoFUAzPz3T3icrfluENwGfLg2BKUAeBcwCA69toSgRQA85u80fBu455CgS39fAgBb8P0xZb5nPFtB0BoAS8w3HU3TC6du4NHVVVMCAFvB/ub69P+LtoCgJQCWmr9T6jzg74XanlheAgD7wB+BSxcOtDQErQCQav63gD0Ae9VXKQCeBx5LGGlJCFoAINV8k/JZ4IkETat0gIuAT4CrEwZcCoLaAFwPvHdgtX+cXF8ANwG/JuhZBQD70Gumy5srEgZdAoKaAOSYb63/duCrBB0PHlIqAnYf3BIEtQDINd/2Sr486GRiQWkAWuoENQBo2nwzZwsAWoFgawCaN39LAFqAYEsAQpi/NQC1IdgKgDDm1wCgJgRbABDK/FoA1IKgNABmvv1Vb+kOqOlhl3pFV/vHXSRstQic+/ytLxFLAhDS/JodoMY+QSkAcsw/O23yFLvOP7Q9ULMD7MZ27bRFWnrHsAQAoc1voQNsCcHaAIQ3vyUAbCylO8GaAHRhfmsAlIZgLQBumCIrZbVfPfP31wQtrAH2x1SqE6wBQFfmt9gBSq4JcgHozvyWASgRBzkAdGl+6wCsDUEqAN2aHwGAHQS2xXr5oU2Nmd8f/c+iFAC6Nj8KAGtBcPN0X6KHI7s9/LPM1b7t7dv/8jX9avEq4DjB7OogpxO8DNhNqZ6X3aT5cOIfduxSL4T5kTrA0auDVAjs/jov8EtqjwIVyvyIAOTGgefsT60JZ35UAFqEIKT5kQFoCYKw5kcHoAUIQpvfAwA1IQhvfi8A1ICgC/N7AmBLCGx30e7Va36Tx3M5470u9rxXCzV2+7XdgZuybewZf1fm99YBdgaWgqA783sFwOa1NgRdmt8zAGtC0K35vQOwBgRdmz8CADkQdG/+KACkQDCE+SMBsASCYcwfDQAPBN3s8Hk2NUYEwOZ8GngBuP/IP4jY9/K/BjwyfcmlV7/wdb3tBC4xxO7sse/eM/M/Bn5ecnAvtSMD0IuHWfMQAFnyxT9YAMT3MGsGAiBLvvgHC4D4HmbNQABkyRf/YAEQ38OsGQiALPniHywA4nuYNQMBkCVf/IP/A7hYo5BxlO53AAAAAElFTkSuQmCC';
		var rfTip = document.createElement('DIV'),
			rfWrap, refreshDom = $(_opt.refreshDom),
			rfIcon, rfText;
		refreshDom.wrap('<div style="overflow: hidden;"><div class="commonlist_pull_refresh_wrap"></div></div>');
		refreshDom.before(rfTip);
		rfTip = $(rfTip);
		rfTip.html('<div style="display:table-cell; vertical-align:middle;padding-top:20px;"><img class="commonlist_pull_refresh_icon" style="margin: 0 5px;width:20px;" /><span class="commonlist_pull_refresh_text"></span></div>');
		rfWrap = $('.commonlist_pull_refresh_wrap');
		rfTip.css({
			position: 'absolute',
			top: '-' + _opt.tipHeight + 'px',
			width: '100%',
			height: _opt.tipHeight,
			'text-align': 'center',
			'vertical-align': 'middle',
			'display': 'table'
		});
		rfIcon = rfTip.find('.commonlist_pull_refresh_icon');
		rfText = rfTip.find('.commonlist_pull_refresh_text');
		var _start = 0,
			_end, _pullTag = 0;
		refreshDom.on('touchstart', function(event) {
			if(_getScrollTop() == 0 && _pullTag == 0) {
				var touch = event.targetTouches[0];
				_start = touch.pageY;
				_pullTag = 1;
				_beforePull();
			}
		}).on('touchmove', function(event) {
			if(_pullTag >= 1) {
				var touch = event.targetTouches[0];
				_end = touch.pageY - _start;
				var curHeight = _end / 2.2;
				if(_end > 0 && curHeight < _opt.tipHeight) {
					if(curHeight >= _opt.tipHeight * 0.7) {
						_pullTag = 2;
						_canRefresh();
					} else if(curHeight < _opt.tipHeight * 0.7) {
						_pullTag = 1;
						_beforePull();
					}
					_pulling(curHeight);
					event.preventDefault();
				}
			}
		}).on('touchend', function() {
			if(_pullTag == 2) {
				if(_end > 0) {
					_release();
					_opt.onRelease.apply(that, []);
				}
			} else {
				_pullTag = 0;
				that.afterPull();
			}
		});

		function _beforePull() {
			var state = rfTip.attr('data-state');
			if(state != 'beforePull') {
				rfIcon.attr('src', arrow);
				rfIcon.css({
					'-webkit-transition': 'all 0.5s',
					'-webkit-transform': 'rotateZ(0)'
				});
				rfText.html('下拉即可刷新');
				rfTip.attr('data-state', 'beforePull');
			}
		}

		function _canRefresh() {
			var state = rfTip.attr('data-state');
			if(state != 'canRefresh') {
				rfIcon.attr('src', arrow);
				rfIcon.css({
					'-webkit-transition': 'all 0.5s',
					'-webkit-transform': 'rotateZ(180deg)'
				});
				rfText.html('释放即可刷新');
				rfTip.attr('data-state', 'canRefresh');
			}
		}

		function _pulling(curHeight) {
			rfWrap.css({
				'-webkit-transition': 'all 0s',
				'-webkit-transform': 'translateY(' + curHeight + 'px)'
			});
		}

		function _release() {
			rfWrap.css({
				'-webkit-transition': 'all 0.3s ease',
				'-webkit-transform': 'translateY(' + _opt.tipHeight * 0.9 + 'px)'
			});
			rfIcon.attr('src', 'http://st.midea.com/h5/img/common/loading32.gif');
			rfIcon.css({
				'-webkit-transition': 'none',
				'-webkit-transform': 'rotateZ(0deg)'
			});
			rfText.html('加载中，请稍候...');
			rfTip.attr('data-state', 'release');
		}

		function _getScrollTop() {
			return _opt.scrollDom ? _opt.scrollDom.scrollTop() : window.scrollY;
		}
		this.afterPull = function() {
			rfWrap.css({
				'-webkit-transition': 'all 0.5s ease',
				'-webkit-transform': 'translateY(0px)'
			}).on('webkitTransitionEnd', function() {
				_pullTag = 0;
				rfTip.attr('data-state', '');
				$(this).unbind('webkitTransitionEnd');
			});
		}
	};
	exports.init = function(opt) {
		return new PullRefresh(opt);
	}
});
define('qrcode', function(require, exports, module) {
	/**
	 * @fileoverview
	 * - Using the 'QRCode for Javascript library'
	 * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
	 * - this library has no dependencies.
	 *
	 * @author davidshimjs
	 * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
	 * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
	 */
	var QRCode;

	//---------------------------------------------------------------------
	// QRCode for JavaScript
	//
	// Copyright (c) 2009 Kazuhiko Arase
	//
	// URL: http://www.d-project.com/
	//
	// Licensed under the MIT license:
	//   http://www.opensource.org/licenses/mit-license.php
	//
	// The word "QR Code" is registered trademark of
	// DENSO WAVE INCORPORATED
	//   http://www.denso-wave.com/qrcode/faqpatent-e.html
	//
	//---------------------------------------------------------------------
	function QR8bitByte(data) {
		this.mode = QRMode.MODE_8BIT_BYTE;
		this.data = data;
		this.parsedData = [];

		// Added to support UTF-8 Characters
		for(var i = 0, l = this.data.length; i < l; i++) {
			var byteArray = [];
			var code = this.data.charCodeAt(i);

			if(code > 0x10000) {
				byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
				byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
				byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
				byteArray[3] = 0x80 | (code & 0x3F);
			} else if(code > 0x800) {
				byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
				byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
				byteArray[2] = 0x80 | (code & 0x3F);
			} else if(code > 0x80) {
				byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
				byteArray[1] = 0x80 | (code & 0x3F);
			} else {
				byteArray[0] = code;
			}

			this.parsedData.push(byteArray);
		}

		this.parsedData = Array.prototype.concat.apply([], this.parsedData);

		if(this.parsedData.length != this.data.length) {
			this.parsedData.unshift(191);
			this.parsedData.unshift(187);
			this.parsedData.unshift(239);
		}
	}

	QR8bitByte.prototype = {
		getLength: function(buffer) {
			return this.parsedData.length;
		},
		write: function(buffer) {
			for(var i = 0, l = this.parsedData.length; i < l; i++) {
				buffer.put(this.parsedData[i], 8);
			}
		}
	};

	function QRCodeModel(typeNumber, errorCorrectLevel) {
		this.typeNumber = typeNumber;
		this.errorCorrectLevel = errorCorrectLevel;
		this.modules = null;
		this.moduleCount = 0;
		this.dataCache = null;
		this.dataList = [];
	}

	QRCodeModel.prototype = {
		addData: function(data) {
			var newData = new QR8bitByte(data);
			this.dataList.push(newData);
			this.dataCache = null;
		},
		isDark: function(row, col) {
			if(row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
				throw new Error(row + "," + col);
			}
			return this.modules[row][col];
		},
		getModuleCount: function() {
			return this.moduleCount;
		},
		make: function() {
			this.makeImpl(false, this.getBestMaskPattern());
		},
		makeImpl: function(test, maskPattern) {
			this.moduleCount = this.typeNumber * 4 + 17;
			this.modules = new Array(this.moduleCount);
			for(var row = 0; row < this.moduleCount; row++) {
				this.modules[row] = new Array(this.moduleCount);
				for(var col = 0; col < this.moduleCount; col++) {
					this.modules[row][col] = null;
				}
			}
			this.setupPositionProbePattern(0, 0);
			this.setupPositionProbePattern(this.moduleCount - 7, 0);
			this.setupPositionProbePattern(0, this.moduleCount - 7);
			this.setupPositionAdjustPattern();
			this.setupTimingPattern();
			this.setupTypeInfo(test, maskPattern);
			if(this.typeNumber >= 7) {
				this.setupTypeNumber(test);
			}
			if(this.dataCache == null) {
				this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
			}
			this.mapData(this.dataCache, maskPattern);
		},
		setupPositionProbePattern: function(row, col) {
			for(var r = -1; r <= 7; r++) {
				if(row + r <= -1 || this.moduleCount <= row + r) continue;
				for(var c = -1; c <= 7; c++) {
					if(col + c <= -1 || this.moduleCount <= col + c) continue;
					if((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
						this.modules[row + r][col + c] = true;
					} else {
						this.modules[row + r][col + c] = false;
					}
				}
			}
		},
		getBestMaskPattern: function() {
			var minLostPoint = 0;
			var pattern = 0;
			for(var i = 0; i < 8; i++) {
				this.makeImpl(true, i);
				var lostPoint = QRUtil.getLostPoint(this);
				if(i == 0 || minLostPoint > lostPoint) {
					minLostPoint = lostPoint;
					pattern = i;
				}
			}
			return pattern;
		},
		createMovieClip: function(target_mc, instance_name, depth) {
			var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
			var cs = 1;
			this.make();
			for(var row = 0; row < this.modules.length; row++) {
				var y = row * cs;
				for(var col = 0; col < this.modules[row].length; col++) {
					var x = col * cs;
					var dark = this.modules[row][col];
					if(dark) {
						qr_mc.beginFill(0, 100);
						qr_mc.moveTo(x, y);
						qr_mc.lineTo(x + cs, y);
						qr_mc.lineTo(x + cs, y + cs);
						qr_mc.lineTo(x, y + cs);
						qr_mc.endFill();
					}
				}
			}
			return qr_mc;
		},
		setupTimingPattern: function() {
			for(var r = 8; r < this.moduleCount - 8; r++) {
				if(this.modules[r][6] != null) {
					continue;
				}
				this.modules[r][6] = (r % 2 == 0);
			}
			for(var c = 8; c < this.moduleCount - 8; c++) {
				if(this.modules[6][c] != null) {
					continue;
				}
				this.modules[6][c] = (c % 2 == 0);
			}
		},
		setupPositionAdjustPattern: function() {
			var pos = QRUtil.getPatternPosition(this.typeNumber);
			for(var i = 0; i < pos.length; i++) {
				for(var j = 0; j < pos.length; j++) {
					var row = pos[i];
					var col = pos[j];
					if(this.modules[row][col] != null) {
						continue;
					}
					for(var r = -2; r <= 2; r++) {
						for(var c = -2; c <= 2; c++) {
							if(r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
								this.modules[row + r][col + c] = true;
							} else {
								this.modules[row + r][col + c] = false;
							}
						}
					}
				}
			}
		},
		setupTypeNumber: function(test) {
			var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
			for(var i = 0; i < 18; i++) {
				var mod = (!test && ((bits >> i) & 1) == 1);
				this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
			}
			for(var i = 0; i < 18; i++) {
				var mod = (!test && ((bits >> i) & 1) == 1);
				this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
			}
		},
		setupTypeInfo: function(test, maskPattern) {
			var data = (this.errorCorrectLevel << 3) | maskPattern;
			var bits = QRUtil.getBCHTypeInfo(data);
			for(var i = 0; i < 15; i++) {
				var mod = (!test && ((bits >> i) & 1) == 1);
				if(i < 6) {
					this.modules[i][8] = mod;
				} else if(i < 8) {
					this.modules[i + 1][8] = mod;
				} else {
					this.modules[this.moduleCount - 15 + i][8] = mod;
				}
			}
			for(var i = 0; i < 15; i++) {
				var mod = (!test && ((bits >> i) & 1) == 1);
				if(i < 8) {
					this.modules[8][this.moduleCount - i - 1] = mod;
				} else if(i < 9) {
					this.modules[8][15 - i - 1 + 1] = mod;
				} else {
					this.modules[8][15 - i - 1] = mod;
				}
			}
			this.modules[this.moduleCount - 8][8] = (!test);
		},
		mapData: function(data, maskPattern) {
			var inc = -1;
			var row = this.moduleCount - 1;
			var bitIndex = 7;
			var byteIndex = 0;
			for(var col = this.moduleCount - 1; col > 0; col -= 2) {
				if(col == 6) col--;
				while(true) {
					for(var c = 0; c < 2; c++) {
						if(this.modules[row][col - c] == null) {
							var dark = false;
							if(byteIndex < data.length) {
								dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
							}
							var mask = QRUtil.getMask(maskPattern, row, col - c);
							if(mask) {
								dark = !dark;
							}
							this.modules[row][col - c] = dark;
							bitIndex--;
							if(bitIndex == -1) {
								byteIndex++;
								bitIndex = 7;
							}
						}
					}
					row += inc;
					if(row < 0 || this.moduleCount <= row) {
						row -= inc;
						inc = -inc;
						break;
					}
				}
			}
		}
	};
	QRCodeModel.PAD0 = 0xEC;
	QRCodeModel.PAD1 = 0x11;
	QRCodeModel.createData = function(typeNumber, errorCorrectLevel, dataList) {
		var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
		var buffer = new QRBitBuffer();
		for(var i = 0; i < dataList.length; i++) {
			var data = dataList[i];
			buffer.put(data.mode, 4);
			buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
			data.write(buffer);
		}
		var totalDataCount = 0;
		for(var i = 0; i < rsBlocks.length; i++) {
			totalDataCount += rsBlocks[i].dataCount;
		}
		if(buffer.getLengthInBits() > totalDataCount * 8) {
			throw new Error("code length overflow. (" +
				buffer.getLengthInBits() +
				">" +
				totalDataCount * 8 +
				")");
		}
		if(buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
			buffer.put(0, 4);
		}
		while(buffer.getLengthInBits() % 8 != 0) {
			buffer.putBit(false);
		}
		while(true) {
			if(buffer.getLengthInBits() >= totalDataCount * 8) {
				break;
			}
			buffer.put(QRCodeModel.PAD0, 8);
			if(buffer.getLengthInBits() >= totalDataCount * 8) {
				break;
			}
			buffer.put(QRCodeModel.PAD1, 8);
		}
		return QRCodeModel.createBytes(buffer, rsBlocks);
	};
	QRCodeModel.createBytes = function(buffer, rsBlocks) {
		var offset = 0;
		var maxDcCount = 0;
		var maxEcCount = 0;
		var dcdata = new Array(rsBlocks.length);
		var ecdata = new Array(rsBlocks.length);
		for(var r = 0; r < rsBlocks.length; r++) {
			var dcCount = rsBlocks[r].dataCount;
			var ecCount = rsBlocks[r].totalCount - dcCount;
			maxDcCount = Math.max(maxDcCount, dcCount);
			maxEcCount = Math.max(maxEcCount, ecCount);
			dcdata[r] = new Array(dcCount);
			for(var i = 0; i < dcdata[r].length; i++) {
				dcdata[r][i] = 0xff & buffer.buffer[i + offset];
			}
			offset += dcCount;
			var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
			var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
			var modPoly = rawPoly.mod(rsPoly);
			ecdata[r] = new Array(rsPoly.getLength() - 1);
			for(var i = 0; i < ecdata[r].length; i++) {
				var modIndex = i + modPoly.getLength() - ecdata[r].length;
				ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
			}
		}
		var totalCodeCount = 0;
		for(var i = 0; i < rsBlocks.length; i++) {
			totalCodeCount += rsBlocks[i].totalCount;
		}
		var data = new Array(totalCodeCount);
		var index = 0;
		for(var i = 0; i < maxDcCount; i++) {
			for(var r = 0; r < rsBlocks.length; r++) {
				if(i < dcdata[r].length) {
					data[index++] = dcdata[r][i];
				}
			}
		}
		for(var i = 0; i < maxEcCount; i++) {
			for(var r = 0; r < rsBlocks.length; r++) {
				if(i < ecdata[r].length) {
					data[index++] = ecdata[r][i];
				}
			}
		}
		return data;
	};
	var QRMode = {
		MODE_NUMBER: 1 << 0,
		MODE_ALPHA_NUM: 1 << 1,
		MODE_8BIT_BYTE: 1 << 2,
		MODE_KANJI: 1 << 3
	};
	var QRErrorCorrectLevel = {
		L: 1,
		M: 0,
		Q: 3,
		H: 2
	};
	var QRMaskPattern = {
		PATTERN000: 0,
		PATTERN001: 1,
		PATTERN010: 2,
		PATTERN011: 3,
		PATTERN100: 4,
		PATTERN101: 5,
		PATTERN110: 6,
		PATTERN111: 7
	};
	var QRUtil = {
		PATTERN_POSITION_TABLE: [
			[],
			[6, 18],
			[6, 22],
			[6, 26],
			[6, 30],
			[6, 34],
			[6, 22, 38],
			[6, 24, 42],
			[6, 26, 46],
			[6, 28, 50],
			[6, 30, 54],
			[6, 32, 58],
			[6, 34, 62],
			[6, 26, 46, 66],
			[6, 26, 48, 70],
			[6, 26, 50, 74],
			[6, 30, 54, 78],
			[6, 30, 56, 82],
			[6, 30, 58, 86],
			[6, 34, 62, 90],
			[6, 28, 50, 72, 94],
			[6, 26, 50, 74, 98],
			[6, 30, 54, 78, 102],
			[6, 28, 54, 80, 106],
			[6, 32, 58, 84, 110],
			[6, 30, 58, 86, 114],
			[6, 34, 62, 90, 118],
			[6, 26, 50, 74, 98, 122],
			[6, 30, 54, 78, 102, 126],
			[6, 26, 52, 78, 104, 130],
			[6, 30, 56, 82, 108, 134],
			[6, 34, 60, 86, 112, 138],
			[6, 30, 58, 86, 114, 142],
			[6, 34, 62, 90, 118, 146],
			[6, 30, 54, 78, 102, 126, 150],
			[6, 24, 50, 76, 102, 128, 154],
			[6, 28, 54, 80, 106, 132, 158],
			[6, 32, 58, 84, 110, 136, 162],
			[6, 26, 54, 82, 110, 138, 166],
			[6, 30, 58, 86, 114, 142, 170]
		],
		G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
		G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
		G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
		getBCHTypeInfo: function(data) {
			var d = data << 10;
			while(QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
				d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
			}
			return((data << 10) | d) ^ QRUtil.G15_MASK;
		},
		getBCHTypeNumber: function(data) {
			var d = data << 12;
			while(QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
				d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
			}
			return(data << 12) | d;
		},
		getBCHDigit: function(data) {
			var digit = 0;
			while(data != 0) {
				digit++;
				data >>>= 1;
			}
			return digit;
		},
		getPatternPosition: function(typeNumber) {
			return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
		},
		getMask: function(maskPattern, i, j) {
			switch(maskPattern) {
				case QRMaskPattern.PATTERN000:
					return(i + j) % 2 == 0;
				case QRMaskPattern.PATTERN001:
					return i % 2 == 0;
				case QRMaskPattern.PATTERN010:
					return j % 3 == 0;
				case QRMaskPattern.PATTERN011:
					return(i + j) % 3 == 0;
				case QRMaskPattern.PATTERN100:
					return(Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
				case QRMaskPattern.PATTERN101:
					return(i * j) % 2 + (i * j) % 3 == 0;
				case QRMaskPattern.PATTERN110:
					return((i * j) % 2 + (i * j) % 3) % 2 == 0;
				case QRMaskPattern.PATTERN111:
					return((i * j) % 3 + (i + j) % 2) % 2 == 0;
				default:
					throw new Error("bad maskPattern:" + maskPattern);
			}
		},
		getErrorCorrectPolynomial: function(errorCorrectLength) {
			var a = new QRPolynomial([1], 0);
			for(var i = 0; i < errorCorrectLength; i++) {
				a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
			}
			return a;
		},
		getLengthInBits: function(mode, type) {
			if(1 <= type && type < 10) {
				switch(mode) {
					case QRMode.MODE_NUMBER:
						return 10;
					case QRMode.MODE_ALPHA_NUM:
						return 9;
					case QRMode.MODE_8BIT_BYTE:
						return 8;
					case QRMode.MODE_KANJI:
						return 8;
					default:
						throw new Error("mode:" + mode);
				}
			} else if(type < 27) {
				switch(mode) {
					case QRMode.MODE_NUMBER:
						return 12;
					case QRMode.MODE_ALPHA_NUM:
						return 11;
					case QRMode.MODE_8BIT_BYTE:
						return 16;
					case QRMode.MODE_KANJI:
						return 10;
					default:
						throw new Error("mode:" + mode);
				}
			} else if(type < 41) {
				switch(mode) {
					case QRMode.MODE_NUMBER:
						return 14;
					case QRMode.MODE_ALPHA_NUM:
						return 13;
					case QRMode.MODE_8BIT_BYTE:
						return 16;
					case QRMode.MODE_KANJI:
						return 12;
					default:
						throw new Error("mode:" + mode);
				}
			} else {
				throw new Error("type:" + type);
			}
		},
		getLostPoint: function(qrCode) {
			var moduleCount = qrCode.getModuleCount();
			var lostPoint = 0;
			for(var row = 0; row < moduleCount; row++) {
				for(var col = 0; col < moduleCount; col++) {
					var sameCount = 0;
					var dark = qrCode.isDark(row, col);
					for(var r = -1; r <= 1; r++) {
						if(row + r < 0 || moduleCount <= row + r) {
							continue;
						}
						for(var c = -1; c <= 1; c++) {
							if(col + c < 0 || moduleCount <= col + c) {
								continue;
							}
							if(r == 0 && c == 0) {
								continue;
							}
							if(dark == qrCode.isDark(row + r, col + c)) {
								sameCount++;
							}
						}
					}
					if(sameCount > 5) {
						lostPoint += (3 + sameCount - 5);
					}
				}
			}
			for(var row = 0; row < moduleCount - 1; row++) {
				for(var col = 0; col < moduleCount - 1; col++) {
					var count = 0;
					if(qrCode.isDark(row, col)) count++;
					if(qrCode.isDark(row + 1, col)) count++;
					if(qrCode.isDark(row, col + 1)) count++;
					if(qrCode.isDark(row + 1, col + 1)) count++;
					if(count == 0 || count == 4) {
						lostPoint += 3;
					}
				}
			}
			for(var row = 0; row < moduleCount; row++) {
				for(var col = 0; col < moduleCount - 6; col++) {
					if(qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) {
						lostPoint += 40;
					}
				}
			}
			for(var col = 0; col < moduleCount; col++) {
				for(var row = 0; row < moduleCount - 6; row++) {
					if(qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) {
						lostPoint += 40;
					}
				}
			}
			var darkCount = 0;
			for(var col = 0; col < moduleCount; col++) {
				for(var row = 0; row < moduleCount; row++) {
					if(qrCode.isDark(row, col)) {
						darkCount++;
					}
				}
			}
			var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
			lostPoint += ratio * 10;
			return lostPoint;
		}
	};
	var QRMath = {
		glog: function(n) {
			if(n < 1) {
				throw new Error("glog(" + n + ")");
			}
			return QRMath.LOG_TABLE[n];
		},
		gexp: function(n) {
			while(n < 0) {
				n += 255;
			}
			while(n >= 256) {
				n -= 255;
			}
			return QRMath.EXP_TABLE[n];
		},
		EXP_TABLE: new Array(256),
		LOG_TABLE: new Array(256)
	};
	for(var i = 0; i < 8; i++) {
		QRMath.EXP_TABLE[i] = 1 << i;
	}
	for(var i = 8; i < 256; i++) {
		QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
	}
	for(var i = 0; i < 255; i++) {
		QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
	}

	function QRPolynomial(num, shift) {
		if(num.length == undefined) {
			throw new Error(num.length + "/" + shift);
		}
		var offset = 0;
		while(offset < num.length && num[offset] == 0) {
			offset++;
		}
		this.num = new Array(num.length - offset + shift);
		for(var i = 0; i < num.length - offset; i++) {
			this.num[i] = num[i + offset];
		}
	}
	QRPolynomial.prototype = {
		get: function(index) {
			return this.num[index];
		},
		getLength: function() {
			return this.num.length;
		},
		multiply: function(e) {
			var num = new Array(this.getLength() + e.getLength() - 1);
			for(var i = 0; i < this.getLength(); i++) {
				for(var j = 0; j < e.getLength(); j++) {
					num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
				}
			}
			return new QRPolynomial(num, 0);
		},
		mod: function(e) {
			if(this.getLength() - e.getLength() < 0) {
				return this;
			}
			var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
			var num = new Array(this.getLength());
			for(var i = 0; i < this.getLength(); i++) {
				num[i] = this.get(i);
			}
			for(var i = 0; i < e.getLength(); i++) {
				num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
			}
			return new QRPolynomial(num, 0).mod(e);
		}
	};

	function QRRSBlock(totalCount, dataCount) {
		this.totalCount = totalCount;
		this.dataCount = dataCount;
	}
	QRRSBlock.RS_BLOCK_TABLE = [
		[1, 26, 19],
		[1, 26, 16],
		[1, 26, 13],
		[1, 26, 9],
		[1, 44, 34],
		[1, 44, 28],
		[1, 44, 22],
		[1, 44, 16],
		[1, 70, 55],
		[1, 70, 44],
		[2, 35, 17],
		[2, 35, 13],
		[1, 100, 80],
		[2, 50, 32],
		[2, 50, 24],
		[4, 25, 9],
		[1, 134, 108],
		[2, 67, 43],
		[2, 33, 15, 2, 34, 16],
		[2, 33, 11, 2, 34, 12],
		[2, 86, 68],
		[4, 43, 27],
		[4, 43, 19],
		[4, 43, 15],
		[2, 98, 78],
		[4, 49, 31],
		[2, 32, 14, 4, 33, 15],
		[4, 39, 13, 1, 40, 14],
		[2, 121, 97],
		[2, 60, 38, 2, 61, 39],
		[4, 40, 18, 2, 41, 19],
		[4, 40, 14, 2, 41, 15],
		[2, 146, 116],
		[3, 58, 36, 2, 59, 37],
		[4, 36, 16, 4, 37, 17],
		[4, 36, 12, 4, 37, 13],
		[2, 86, 68, 2, 87, 69],
		[4, 69, 43, 1, 70, 44],
		[6, 43, 19, 2, 44, 20],
		[6, 43, 15, 2, 44, 16],
		[4, 101, 81],
		[1, 80, 50, 4, 81, 51],
		[4, 50, 22, 4, 51, 23],
		[3, 36, 12, 8, 37, 13],
		[2, 116, 92, 2, 117, 93],
		[6, 58, 36, 2, 59, 37],
		[4, 46, 20, 6, 47, 21],
		[7, 42, 14, 4, 43, 15],
		[4, 133, 107],
		[8, 59, 37, 1, 60, 38],
		[8, 44, 20, 4, 45, 21],
		[12, 33, 11, 4, 34, 12],
		[3, 145, 115, 1, 146, 116],
		[4, 64, 40, 5, 65, 41],
		[11, 36, 16, 5, 37, 17],
		[11, 36, 12, 5, 37, 13],
		[5, 109, 87, 1, 110, 88],
		[5, 65, 41, 5, 66, 42],
		[5, 54, 24, 7, 55, 25],
		[11, 36, 12],
		[5, 122, 98, 1, 123, 99],
		[7, 73, 45, 3, 74, 46],
		[15, 43, 19, 2, 44, 20],
		[3, 45, 15, 13, 46, 16],
		[1, 135, 107, 5, 136, 108],
		[10, 74, 46, 1, 75, 47],
		[1, 50, 22, 15, 51, 23],
		[2, 42, 14, 17, 43, 15],
		[5, 150, 120, 1, 151, 121],
		[9, 69, 43, 4, 70, 44],
		[17, 50, 22, 1, 51, 23],
		[2, 42, 14, 19, 43, 15],
		[3, 141, 113, 4, 142, 114],
		[3, 70, 44, 11, 71, 45],
		[17, 47, 21, 4, 48, 22],
		[9, 39, 13, 16, 40, 14],
		[3, 135, 107, 5, 136, 108],
		[3, 67, 41, 13, 68, 42],
		[15, 54, 24, 5, 55, 25],
		[15, 43, 15, 10, 44, 16],
		[4, 144, 116, 4, 145, 117],
		[17, 68, 42],
		[17, 50, 22, 6, 51, 23],
		[19, 46, 16, 6, 47, 17],
		[2, 139, 111, 7, 140, 112],
		[17, 74, 46],
		[7, 54, 24, 16, 55, 25],
		[34, 37, 13],
		[4, 151, 121, 5, 152, 122],
		[4, 75, 47, 14, 76, 48],
		[11, 54, 24, 14, 55, 25],
		[16, 45, 15, 14, 46, 16],
		[6, 147, 117, 4, 148, 118],
		[6, 73, 45, 14, 74, 46],
		[11, 54, 24, 16, 55, 25],
		[30, 46, 16, 2, 47, 17],
		[8, 132, 106, 4, 133, 107],
		[8, 75, 47, 13, 76, 48],
		[7, 54, 24, 22, 55, 25],
		[22, 45, 15, 13, 46, 16],
		[10, 142, 114, 2, 143, 115],
		[19, 74, 46, 4, 75, 47],
		[28, 50, 22, 6, 51, 23],
		[33, 46, 16, 4, 47, 17],
		[8, 152, 122, 4, 153, 123],
		[22, 73, 45, 3, 74, 46],
		[8, 53, 23, 26, 54, 24],
		[12, 45, 15, 28, 46, 16],
		[3, 147, 117, 10, 148, 118],
		[3, 73, 45, 23, 74, 46],
		[4, 54, 24, 31, 55, 25],
		[11, 45, 15, 31, 46, 16],
		[7, 146, 116, 7, 147, 117],
		[21, 73, 45, 7, 74, 46],
		[1, 53, 23, 37, 54, 24],
		[19, 45, 15, 26, 46, 16],
		[5, 145, 115, 10, 146, 116],
		[19, 75, 47, 10, 76, 48],
		[15, 54, 24, 25, 55, 25],
		[23, 45, 15, 25, 46, 16],
		[13, 145, 115, 3, 146, 116],
		[2, 74, 46, 29, 75, 47],
		[42, 54, 24, 1, 55, 25],
		[23, 45, 15, 28, 46, 16],
		[17, 145, 115],
		[10, 74, 46, 23, 75, 47],
		[10, 54, 24, 35, 55, 25],
		[19, 45, 15, 35, 46, 16],
		[17, 145, 115, 1, 146, 116],
		[14, 74, 46, 21, 75, 47],
		[29, 54, 24, 19, 55, 25],
		[11, 45, 15, 46, 46, 16],
		[13, 145, 115, 6, 146, 116],
		[14, 74, 46, 23, 75, 47],
		[44, 54, 24, 7, 55, 25],
		[59, 46, 16, 1, 47, 17],
		[12, 151, 121, 7, 152, 122],
		[12, 75, 47, 26, 76, 48],
		[39, 54, 24, 14, 55, 25],
		[22, 45, 15, 41, 46, 16],
		[6, 151, 121, 14, 152, 122],
		[6, 75, 47, 34, 76, 48],
		[46, 54, 24, 10, 55, 25],
		[2, 45, 15, 64, 46, 16],
		[17, 152, 122, 4, 153, 123],
		[29, 74, 46, 14, 75, 47],
		[49, 54, 24, 10, 55, 25],
		[24, 45, 15, 46, 46, 16],
		[4, 152, 122, 18, 153, 123],
		[13, 74, 46, 32, 75, 47],
		[48, 54, 24, 14, 55, 25],
		[42, 45, 15, 32, 46, 16],
		[20, 147, 117, 4, 148, 118],
		[40, 75, 47, 7, 76, 48],
		[43, 54, 24, 22, 55, 25],
		[10, 45, 15, 67, 46, 16],
		[19, 148, 118, 6, 149, 119],
		[18, 75, 47, 31, 76, 48],
		[34, 54, 24, 34, 55, 25],
		[20, 45, 15, 61, 46, 16]
	];
	QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
		var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
		if(rsBlock == undefined) {
			throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
		}
		var length = rsBlock.length / 3;
		var list = [];
		for(var i = 0; i < length; i++) {
			var count = rsBlock[i * 3 + 0];
			var totalCount = rsBlock[i * 3 + 1];
			var dataCount = rsBlock[i * 3 + 2];
			for(var j = 0; j < count; j++) {
				list.push(new QRRSBlock(totalCount, dataCount));
			}
		}
		return list;
	};
	QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {
		switch(errorCorrectLevel) {
			case QRErrorCorrectLevel.L:
				return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
			case QRErrorCorrectLevel.M:
				return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
			case QRErrorCorrectLevel.Q:
				return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
			case QRErrorCorrectLevel.H:
				return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
			default:
				return undefined;
		}
	};

	function QRBitBuffer() {
		this.buffer = [];
		this.length = 0;
	}
	QRBitBuffer.prototype = {
		get: function(index) {
			var bufIndex = Math.floor(index / 8);
			return((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
		},
		put: function(num, length) {
			for(var i = 0; i < length; i++) {
				this.putBit(((num >>> (length - i - 1)) & 1) == 1);
			}
		},
		getLengthInBits: function() {
			return this.length;
		},
		putBit: function(bit) {
			var bufIndex = Math.floor(this.length / 8);
			if(this.buffer.length <= bufIndex) {
				this.buffer.push(0);
			}
			if(bit) {
				this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
			}
			this.length++;
		}
	};
	var QRCodeLimitLength = [
		[17, 14, 11, 7],
		[32, 26, 20, 14],
		[53, 42, 32, 24],
		[78, 62, 46, 34],
		[106, 84, 60, 44],
		[134, 106, 74, 58],
		[154, 122, 86, 64],
		[192, 152, 108, 84],
		[230, 180, 130, 98],
		[271, 213, 151, 119],
		[321, 251, 177, 137],
		[367, 287, 203, 155],
		[425, 331, 241, 177],
		[458, 362, 258, 194],
		[520, 412, 292, 220],
		[586, 450, 322, 250],
		[644, 504, 364, 280],
		[718, 560, 394, 310],
		[792, 624, 442, 338],
		[858, 666, 482, 382],
		[929, 711, 509, 403],
		[1003, 779, 565, 439],
		[1091, 857, 611, 461],
		[1171, 911, 661, 511],
		[1273, 997, 715, 535],
		[1367, 1059, 751, 593],
		[1465, 1125, 805, 625],
		[1528, 1190, 868, 658],
		[1628, 1264, 908, 698],
		[1732, 1370, 982, 742],
		[1840, 1452, 1030, 790],
		[1952, 1538, 1112, 842],
		[2068, 1628, 1168, 898],
		[2188, 1722, 1228, 958],
		[2303, 1809, 1283, 983],
		[2431, 1911, 1351, 1051],
		[2563, 1989, 1423, 1093],
		[2699, 2099, 1499, 1139],
		[2809, 2213, 1579, 1219],
		[2953, 2331, 1663, 1273]
	];

	function _isSupportCanvas() {
		return typeof CanvasRenderingContext2D != "undefined";
	}

	// android 2.x doesn't support Data-URI spec
	function _getAndroid() {
		var android = false;
		var sAgent = navigator.userAgent;

		if(/android/i.test(sAgent)) { // android
			android = true;
			var aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i);

			if(aMat && aMat[1]) {
				android = parseFloat(aMat[1]);
			}
		}

		return android;
	}

	var svgDrawer = (function() {

		var Drawing = function(el, htOption) {
			this._el = el;
			this._htOption = htOption;
		};

		Drawing.prototype.draw = function(oQRCode) {
			var _htOption = this._htOption;
			var _el = this._el;
			var nCount = oQRCode.getModuleCount();
			var nWidth = Math.floor(_htOption.width / nCount);
			var nHeight = Math.floor(_htOption.height / nCount);

			this.clear();

			function makeSVG(tag, attrs) {
				var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
				for(var k in attrs)
					if(attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
				return el;
			}

			var svg = makeSVG("svg", {
				'viewBox': '0 0 ' + String(nCount) + " " + String(nCount),
				'width': '100%',
				'height': '100%',
				'fill': _htOption.colorLight
			});
			svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
			_el.appendChild(svg);

			svg.appendChild(makeSVG("rect", {
				"fill": _htOption.colorLight,
				"width": "100%",
				"height": "100%"
			}));
			svg.appendChild(makeSVG("rect", {
				"fill": _htOption.colorDark,
				"width": "1",
				"height": "1",
				"id": "template"
			}));

			for(var row = 0; row < nCount; row++) {
				for(var col = 0; col < nCount; col++) {
					if(oQRCode.isDark(row, col)) {
						var child = makeSVG("use", {
							"x": String(row),
							"y": String(col)
						});
						child.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#template")
						svg.appendChild(child);
					}
				}
			}
		};
		Drawing.prototype.clear = function() {
			while(this._el.hasChildNodes())
				this._el.removeChild(this._el.lastChild);
		};
		return Drawing;
	})();

	var useSVG = document.documentElement.tagName.toLowerCase() === "svg";

	// Drawing in DOM by using Table tag
	var Drawing = useSVG ? svgDrawer : !_isSupportCanvas() ? (function() {
		var Drawing = function(el, htOption) {
			this._el = el;
			this._htOption = htOption;
		};

		/**
		 * Draw the QRCode
		 *
		 * @param {QRCode} oQRCode
		 */
		Drawing.prototype.draw = function(oQRCode) {
			var _htOption = this._htOption;
			var _el = this._el;
			var nCount = oQRCode.getModuleCount();
			var nWidth = Math.floor(_htOption.width / nCount);
			var nHeight = Math.floor(_htOption.height / nCount);
			var aHTML = ['<table style="border:0;border-collapse:collapse;">'];

			for(var row = 0; row < nCount; row++) {
				aHTML.push('<tr>');

				for(var col = 0; col < nCount; col++) {
					aHTML.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + nWidth + 'px;height:' + nHeight + 'px;background-color:' + (oQRCode.isDark(row, col) ? _htOption.colorDark : _htOption.colorLight) + ';"></td>');
				}

				aHTML.push('</tr>');
			}

			aHTML.push('</table>');
			_el.innerHTML = aHTML.join('');

			// Fix the margin values as real size.
			var elTable = _el.childNodes[0];
			var nLeftMarginTable = (_htOption.width - elTable.offsetWidth) / 2;
			var nTopMarginTable = (_htOption.height - elTable.offsetHeight) / 2;

			if(nLeftMarginTable > 0 && nTopMarginTable > 0) {
				elTable.style.margin = nTopMarginTable + "px " + nLeftMarginTable + "px";
			}
		};

		/**
		 * Clear the QRCode
		 */
		Drawing.prototype.clear = function() {
			this._el.innerHTML = '';
		};

		return Drawing;
	})() : (function() { // Drawing in Canvas
		function _onMakeImage() {
			this._elImage.src = this._elCanvas.toDataURL("image/png");
			this._elImage.style.display = "block";
			this._elCanvas.style.display = "none";
		}

		// Android 2.1 bug workaround
		// http://code.google.com/p/android/issues/detail?id=5141
		if(this._android && this._android <= 2.1) {
			var factor = 1 / window.devicePixelRatio;
			var drawImage = CanvasRenderingContext2D.prototype.drawImage;
			CanvasRenderingContext2D.prototype.drawImage = function(image, sx, sy, sw, sh, dx, dy, dw, dh) {
				if(("nodeName" in image) && /img/i.test(image.nodeName)) {
					for(var i = arguments.length - 1; i >= 1; i--) {
						arguments[i] = arguments[i] * factor;
					}
				} else if(typeof dw == "undefined") {
					arguments[1] *= factor;
					arguments[2] *= factor;
					arguments[3] *= factor;
					arguments[4] *= factor;
				}

				drawImage.apply(this, arguments);
			};
		}

		/**
		 * Check whether the user's browser supports Data URI or not
		 *
		 * @private
		 * @param {Function} fSuccess Occurs if it supports Data URI
		 * @param {Function} fFail Occurs if it doesn't support Data URI
		 */
		function _safeSetDataURI(fSuccess, fFail) {
			var self = this;
			self._fFail = fFail;
			self._fSuccess = fSuccess;

			// Check it just once
			if(self._bSupportDataURI === null) {
				var el = document.createElement("img");
				var fOnError = function() {
					self._bSupportDataURI = false;

					if(self._fFail) {
						self._fFail.call(self);
					}
				};
				var fOnSuccess = function() {
					self._bSupportDataURI = true;

					if(self._fSuccess) {
						self._fSuccess.call(self);
					}
				};

				el.onabort = fOnError;
				el.onerror = fOnError;
				el.onload = fOnSuccess;
				el.src = "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // the Image contains 1px data.
				return;
			} else if(self._bSupportDataURI === true && self._fSuccess) {
				self._fSuccess.call(self);
			} else if(self._bSupportDataURI === false && self._fFail) {
				self._fFail.call(self);
			}
		};

		/**
		 * Drawing QRCode by using canvas
		 *
		 * @constructor
		 * @param {HTMLElement} el
		 * @param {Object} htOption QRCode Options
		 */
		var Drawing = function(el, htOption) {
			this._bIsPainted = false;
			this._android = _getAndroid();

			this._htOption = htOption;
			this._elCanvas = document.createElement("canvas");
			this._elCanvas.width = htOption.width;
			this._elCanvas.height = htOption.height;
			el.appendChild(this._elCanvas);
			this._el = el;
			this._oContext = this._elCanvas.getContext("2d");
			this._bIsPainted = false;
			this._elImage = document.createElement("img");
			this._elImage.alt = "Scan me!";
			this._elImage.style.display = "none";
			this._el.appendChild(this._elImage);
			this._bSupportDataURI = null;
		};

		/**
		 * Draw the QRCode
		 *
		 * @param {QRCode} oQRCode
		 */
		Drawing.prototype.draw = function(oQRCode) {
			var _elImage = this._elImage;
			var _oContext = this._oContext;
			var _htOption = this._htOption;

			var nCount = oQRCode.getModuleCount();
			var nWidth = _htOption.width / nCount;
			var nHeight = _htOption.height / nCount;
			var nRoundedWidth = Math.round(nWidth);
			var nRoundedHeight = Math.round(nHeight);

			_elImage.style.display = "none";
			this.clear();

			for(var row = 0; row < nCount; row++) {
				for(var col = 0; col < nCount; col++) {
					var bIsDark = oQRCode.isDark(row, col);
					var nLeft = col * nWidth;
					var nTop = row * nHeight;
					_oContext.strokeStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
					_oContext.lineWidth = 1;
					_oContext.fillStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
					_oContext.fillRect(nLeft, nTop, nWidth, nHeight);

					// 안티 앨리어싱 방지 처리
					_oContext.strokeRect(
						Math.floor(nLeft) + 0.5,
						Math.floor(nTop) + 0.5,
						nRoundedWidth,
						nRoundedHeight
					);

					_oContext.strokeRect(
						Math.ceil(nLeft) - 0.5,
						Math.ceil(nTop) - 0.5,
						nRoundedWidth,
						nRoundedHeight
					);
				}
			}

			this._bIsPainted = true;
		};

		/**
		 * Make the image from Canvas if the browser supports Data URI.
		 */
		Drawing.prototype.makeImage = function() {
			if(this._bIsPainted) {
				_safeSetDataURI.call(this, _onMakeImage);
			}
		};

		/**
		 * Return whether the QRCode is painted or not
		 *
		 * @return {Boolean}
		 */
		Drawing.prototype.isPainted = function() {
			return this._bIsPainted;
		};

		/**
		 * Clear the QRCode
		 */
		Drawing.prototype.clear = function() {
			this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height);
			this._bIsPainted = false;
		};

		/**
		 * @private
		 * @param {Number} nNumber
		 */
		Drawing.prototype.round = function(nNumber) {
			if(!nNumber) {
				return nNumber;
			}

			return Math.floor(nNumber * 1000) / 1000;
		};

		return Drawing;
	})();

	/**
	 * Get the type by string length
	 *
	 * @private
	 * @param {String} sText
	 * @param {Number} nCorrectLevel
	 * @return {Number} type
	 */
	function _getTypeNumber(sText, nCorrectLevel) {
		var nType = 1;
		var length = _getUTF8Length(sText);

		for(var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
			var nLimit = 0;

			switch(nCorrectLevel) {
				case QRErrorCorrectLevel.L:
					nLimit = QRCodeLimitLength[i][0];
					break;
				case QRErrorCorrectLevel.M:
					nLimit = QRCodeLimitLength[i][1];
					break;
				case QRErrorCorrectLevel.Q:
					nLimit = QRCodeLimitLength[i][2];
					break;
				case QRErrorCorrectLevel.H:
					nLimit = QRCodeLimitLength[i][3];
					break;
			}

			if(length <= nLimit) {
				break;
			} else {
				nType++;
			}
		}

		if(nType > QRCodeLimitLength.length) {
			throw new Error("Too long data");
		}

		return nType;
	}

	function _getUTF8Length(sText) {
		var replacedText = encodeURI(sText).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
		return replacedText.length + (replacedText.length != sText ? 3 : 0);
	}

	/**
	 * @class QRCode
	 * @constructor
	 * @example
	 * new QRCode(document.getElementById("test"), "http://jindo.dev.naver.com/collie");
	 *
	 * @example
	 * var oQRCode = new QRCode("test", {
	 *    text : "http://naver.com",
	 *    width : 128,
	 *    height : 128
	 * });
	 *
	 * oQRCode.clear(); // Clear the QRCode.
	 * oQRCode.makeCode("http://map.naver.com"); // Re-create the QRCode.
	 *
	 * @param {HTMLElement|String} el target element or 'id' attribute of element.
	 * @param {Object|String} vOption
	 * @param {String} vOption.text QRCode link data
	 * @param {Number} [vOption.width=256]
	 * @param {Number} [vOption.height=256]
	 * @param {String} [vOption.colorDark="#000000"]
	 * @param {String} [vOption.colorLight="#ffffff"]
	 * @param {QRCode.CorrectLevel} [vOption.correctLevel=QRCode.CorrectLevel.H] [L|M|Q|H]
	 */
	QRCode = function(el, vOption) {
		this._htOption = {
			width: 256,
			height: 256,
			typeNumber: 4,
			colorDark: "#000000",
			colorLight: "#ffffff",
			correctLevel: QRErrorCorrectLevel.H
		};

		if(typeof vOption === 'string') {
			vOption = {
				text: vOption
			};
		}

		// Overwrites options
		if(vOption) {
			for(var i in vOption) {
				this._htOption[i] = vOption[i];
			}
		}

		if(typeof el == "string") {
			el = document.getElementById(el);
		}

		if(this._htOption.useSVG) {
			Drawing = svgDrawer;
		}

		this._android = _getAndroid();
		this._el = el;
		this._oQRCode = null;
		this._oDrawing = new Drawing(this._el, this._htOption);

		if(this._htOption.text) {
			this.makeCode(this._htOption.text);
		}
	};

	/**
	 * Make the QRCode
	 *
	 * @param {String} sText link data
	 */
	QRCode.prototype.makeCode = function(sText) {
		this._oQRCode = new QRCodeModel(_getTypeNumber(sText, this._htOption.correctLevel), this._htOption.correctLevel);
		this._oQRCode.addData(sText);
		this._oQRCode.make();
		this._el.title = sText;
		this._oDrawing.draw(this._oQRCode);
		this.makeImage();
	};

	/**
	 * Make the Image from Canvas element
	 * - It occurs automatically
	 * - Android below 3 doesn't support Data-URI spec.
	 *
	 * @private
	 */
	QRCode.prototype.makeImage = function() {
		if(typeof this._oDrawing.makeImage == "function" && (!this._android || this._android >= 3)) {
			this._oDrawing.makeImage();
		}
	};

	/**
	 * Clear the QRCode
	 */
	QRCode.prototype.clear = function() {
		this._oDrawing.clear();
	};

	/**
	 * @name QRCode.CorrectLevel
	 */
	QRCode.CorrectLevel = QRErrorCorrectLevel;

	return QRCode;
	//    exports.qr = QRCode;
});
define('report', function(require, exports, module) {
	var mLoadUrl = require('loadUrl');
	exports.rd = function(opt) {
		var oParams = {
				curl: location.href,
				rurl: document.referrer,
				serviceid: 10,
				mtag: '',
				skuid: '',
				shopid: '',
				command: '',
				dealid: '',
				callback: 'rdcb'
			},
			arrParams = [];
		for(var key in oParams) {
			var v = opt[key];
			if(v) {
				oParams[key] = v;
			}
			arrParams.push(key + '=' + encodeURIComponent(oParams[key]));
		}
		mLoadUrl.get({
			url: '//w.midea.com/common/log/rd?' + arrParams.join('&')
		});
	};
	exports.itil = function(opt) {
		var oParams = {
				id: '',
				state: 1,
				callback: 'itilcb'
			},
			arrParams = [];
		for(var key in oParams) {
			var v = opt[key];
			if(v) {
				oParams[key] = v;
			}
			arrParams.push(key + '=' + encodeURIComponent(oParams[key]));
		}
		mLoadUrl.get({
			url: '//w.midea.com/common/log/itil?' + arrParams.join('&')
		});
	}
});
define('scrollCtrl', function(require, exports, module) {
	var $ = require('zepto');

	function throttle(delay, action, tail, debounce) {
		var now = Date.now,
			last_call = 0,
			last_exec = 0,
			timer = null,
			curr, diff, ctx, args, exec = function() {
				last_exec = now();
				action.apply(ctx, args);
			};
		return function() {
			ctx = this, args = arguments, curr = now(), diff = curr - (debounce ? last_call : last_exec) - delay;
			clearTimeout(timer);
			if(debounce) {
				if(tail) {
					timer = setTimeout(exec, delay);
				} else if(diff >= 0) {
					exec();
				}
			} else {
				if(diff >= 0) {
					exec();
				} else if(tail) {
					timer = setTimeout(exec, -diff);
				}
			}
			last_call = curr;
		}
	}

	function getCss(elem, css) {
		if(window.getComputedStyle) {
			return window.getComputedStyle(elem, null)[css];
		} else if(elem.currentStyle) {
			return elem.currentStyle[css];
		} else {
			return elem.style[css];
		}
	}

	function scrollCtrl(context) {
		var _guid = (new Date()).getTime(),
			_items = {},
			_fix = window.screen.height,
			_activeTypes = {
				'beforeTop': 1,
				'beforeBottom': 2,
				'all': 0
			},
			me = this,
			isArray = Array.isArray || function(object) {
				return object instanceof Array
			};
		!context && (context = document.body);
		this.on = function(objs, activeType, callback) {
			if(!arguments[2]) {
				callback = arguments[1];
				activeType = null;
			}
			if(toString.apply(arguments[0]) !== '[object Array]') {
				objs = [arguments[0]];
			}
			if(objs.pos) {
				_items[_guid++] = {
					target: objs,
					callback: callback,
					enable: true,
					activeType: activeType || 'all'
				}
			} else {
				for(var i = 0; i < objs.length; i++) {
					var obj = objs[i],
						key = obj.id || (_guid++);
					obj.setAttribute('attr-autoload', 1);
					_items[key] = {
						target: obj,
						callback: callback,
						enable: true,
						activeType: activeType || 'all'
					}
				}
			}
			this.watch();
		};
		this.watch = function() {
			var pageHeight = document.documentElement.clientHeight,
				pageTop = $(context).scrollTop(),
				pageBottom = pageHeight + pageTop;
			for(var key in _items) {
				var item = _items[key];
				if(getCss(item.target, 'display') == 'none') {
					return false;
				} else {
					var curParent = $(item.target).parent();
					while(curParent[0] !== document.body) {
						if(getCss(curParent[0], 'display') == 'none') {
							return false;
						}
						curParent = curParent.parent();
					}
				}
				if(!item || (item.enable !== true)) continue;
				var target, itemTop, itemBottom;
				if(item.target.pos) {
					itemTop = item.target[0];
					itemBottom = item.target[1];
				} else {
					target = $(item.target);
					itemTop = this.getItemTop(target[0]);
					itemBottom = itemTop + target.height();
				}
				itemTop -= _fix;
				itemBottom += _fix;
				if(this.checkIsInScreen(itemTop, itemBottom, pageTop, pageBottom, item.activeType)) {
					if(item.enable === true) {
						delete _items[key];
					}
					item.callback.apply(item.target, [item]);
					item.target.removeAttribute('attr-autoload');
				}
			}
		};
		this.checkIsInScreen = function(itemTop, itemBottom, pageTop, pageBottom, activeType) {
			if(activeType === 'all') {
				if((itemTop < pageBottom && itemTop > pageTop) || (itemBottom < pageBottom && itemBottom > pageTop)) {
					return true;
				} else if(itemTop < pageTop && itemBottom > pageBottom) {
					return true;
				}
			} else if(activeType === 'beforeTop' && itemBottom > pageTop) {
				return true;
			} else if(activeType === 'beforeBottom' && itemTop < pageBottom) {
				return true;
			}
			return false;
		};
		this.checkParent = function(domId) {
			if($(domId)[0]) {
				if($(domId).attr('display') == 'none') {
					return false;
				} else {
					this.checkParent($(domId).parent());
				}
			} else {
				return true;
			}
		};
		this.clear = function() {
			_items = {};
		};
		this.getItemTop = function(element) {
			var actualTop = element.offsetTop;
			var current = element.offsetParent;
			while(current && current !== context) {
				actualTop += current.offsetTop;
				current = current.offsetParent;
			}
			return actualTop;
		};
		$(!context || context === document.body ? document : context).on('scroll', throttle(80, function() {
			me.watch();
		}, true));
	}
	exports.init = function(context) {
		return new scrollCtrl(context);
	}
});
define('swiper', function(require, exports, module) {
	! function() {
		"use strict";

		function e(e) {
			e.fn.swiper = function(a) {
				var r;
				return e(this).each(function() {
					var e = new t(this, a);
					r || (r = e)
				}), r
			}
		}
		var a, t = function(e, s) {
			function i() {
				return "horizontal" === w.params.direction
			}

			function n(e) {
				return Math.floor(e)
			}

			function o() {
				w.autoplayTimeoutId = setTimeout(function() {
					w.params.loop ? (w.fixLoop(), w._slideNext()) : w.isEnd ? s.autoplayStopOnLast ? w.stopAutoplay() : w._slideTo(0) : w._slideNext()
				}, w.params.autoplay)
			}

			function l(e, t) {
				var r = a(e.target);
				if(!r.is(t))
					if("string" == typeof t) r = r.parents(t);
					else if(t.nodeType) {
					var s;
					return r.parents().each(function(e, a) {
						a === t && (s = t)
					}), s ? t : void 0
				}
				return 0 === r.length ? void 0 : r[0]
			}

			function d(e, a) {
				a = a || {};
				var t = window.MutationObserver || window.WebkitMutationObserver,
					r = new t(function(e) {
						e.forEach(function(e) {
							w.onResize(!0), w.emit("onObserverUpdate", w, e)
						})
					});
				r.observe(e, {
					attributes: "undefined" == typeof a.attributes ? !0 : a.attributes,
					childList: "undefined" == typeof a.childList ? !0 : a.childList,
					characterData: "undefined" == typeof a.characterData ? !0 : a.characterData
				}), w.observers.push(r)
			}

			function p(e) {
				e.originalEvent && (e = e.originalEvent);
				var a = e.keyCode || e.charCode;
				if(!w.params.allowSwipeToNext && (i() && 39 === a || !i() && 40 === a)) return !1;
				if(!w.params.allowSwipeToPrev && (i() && 37 === a || !i() && 38 === a)) return !1;
				if(!(e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || document.activeElement && document.activeElement.nodeName && ("input" === document.activeElement.nodeName.toLowerCase() || "textarea" === document.activeElement.nodeName.toLowerCase()))) {
					if(37 === a || 39 === a || 38 === a || 40 === a) {
						var t = !1;
						if(w.container.parents(".swiper-slide").length > 0 && 0 === w.container.parents(".swiper-slide-active").length) return;
						var r = {
								left: window.pageXOffset,
								top: window.pageYOffset
							},
							s = window.innerWidth,
							n = window.innerHeight,
							o = w.container.offset();
						w.rtl && (o.left = o.left - w.container[0].scrollLeft);
						for(var l = [
								[o.left, o.top],
								[o.left + w.width, o.top],
								[o.left, o.top + w.height],
								[o.left +
									w.width, o.top + w.height
								]
							], d = 0; d < l.length; d++) {
							var p = l[d];
							p[0] >= r.left && p[0] <= r.left + s && p[1] >= r.top && p[1] <= r.top + n && (t = !0)
						}
						if(!t) return
					}
					i() ? ((37 === a || 39 === a) && (e.preventDefault ? e.preventDefault() : e.returnValue = !1), (39 === a && !w.rtl || 37 === a && w.rtl) && w.slideNext(), (37 === a && !w.rtl || 39 === a && w.rtl) && w.slidePrev()) : ((38 === a || 40 === a) && (e.preventDefault ? e.preventDefault() : e.returnValue = !1), 40 === a && w.slideNext(), 38 === a && w.slidePrev())
				}
			}

			function u(e) {
				e.originalEvent && (e = e.originalEvent);
				var a = w.mousewheel.event,
					t = 0;
				if(e.detail) t = -e.detail;
				else if("mousewheel" === a)
					if(w.params.mousewheelForceToAxis)
						if(i()) {
							if(!(Math.abs(e.wheelDeltaX) > Math.abs(e.wheelDeltaY))) return;
							t = e.wheelDeltaX
						} else {
							if(!(Math.abs(e.wheelDeltaY) > Math.abs(e.wheelDeltaX))) return;
							t = e.wheelDeltaY
						}
				else t = e.wheelDelta;
				else if("DOMMouseScroll" === a) t = -e.detail;
				else if("wheel" === a)
					if(w.params.mousewheelForceToAxis)
						if(i()) {
							if(!(Math.abs(e.deltaX) > Math.abs(e.deltaY))) return;
							t = -e.deltaX
						} else {
							if(!(Math.abs(e.deltaY) > Math.abs(e.deltaX))) return;
							t = -e.deltaY
						}
				else t = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? -e.deltaX : -e.deltaY;
				if(w.params.mousewheelInvert && (t = -t), w.params.freeMode) {
					var r = w.getWrapperTranslate() + t * w.params.mousewheelSensitivity;
					if(r > 0 && (r = 0), r < w.maxTranslate() && (r = w.maxTranslate()), w.setWrapperTransition(0), w.setWrapperTranslate(r), w.updateProgress(), w.updateActiveIndex(), w.params.freeModeSticky && (clearTimeout(w.mousewheel.timeout), w.mousewheel.timeout = setTimeout(function() {
							w.slideReset()
						}, 300)), 0 === r || r === w.maxTranslate()) return
				} else {
					if((new window.Date).getTime() - w.mousewheel.lastScrollTime > 60)
						if(0 > t)
							if(w.isEnd && !w.params.loop || w.animating) {
								if(w.params.mousewheelReleaseOnEdges) return !0
							} else w.slideNext();
					else if(w.isBeginning && !w.params.loop || w.animating) {
						if(w.params.mousewheelReleaseOnEdges) return !0
					} else w.slidePrev();
					w.mousewheel.lastScrollTime = (new window.Date).getTime()
				}
				return w.params.autoplay && w.stopAutoplay(), e.preventDefault ? e.preventDefault() : e.returnValue = !1, !1
			}

			function c(e, t) {
				e = a(e);
				var r, s, n;
				r = e.attr("data-swiper-parallax") || "0", s = e.attr("data-swiper-parallax-x"), n = e.attr("data-swiper-parallax-y"), s || n ? (s = s || "0", n = n || "0") : i() ? (s = r, n = "0") : (n = r, s = "0"), s = s.indexOf("%") >= 0 ? parseInt(s, 10) * t + "%" : s * t + "px", n = n.indexOf("%") >= 0 ? parseInt(n, 10) * t + "%" : n * t + "px", e.transform("translate3d(" + s + ", " + n + ",0px)")
			}

			function m(e) {
				return 0 !== e.indexOf("on") && (e = e[0] !== e[0].toUpperCase() ? "on" + e[0].toUpperCase() + e.substring(1) : "on" + e), e
			}
			if(!(this instanceof t)) return new t(e, s);
			var f = {
					direction: "horizontal",
					touchEventsTarget: "container",
					initialSlide: 0,
					speed: 300,
					autoplay: !1,
					autoplayDisableOnInteraction: !0,
					iOSEdgeSwipeDetection: !1,
					iOSEdgeSwipeThreshold: 20,
					freeMode: !1,
					freeModeMomentum: !0,
					freeModeMomentumRatio: 1,
					freeModeMomentumBounce: !0,
					freeModeMomentumBounceRatio: 1,
					freeModeSticky: !1,
					setWrapperSize: !1,
					virtualTranslate: !1,
					effect: "slide",
					coverflow: {
						rotate: 50,
						stretch: 0,
						depth: 100,
						modifier: 1,
						slideShadows: !0
					},
					cube: {
						slideShadows: !0,
						shadow: !0,
						shadowOffset: 20,
						shadowScale: .94
					},
					fade: {
						crossFade: !1
					},
					parallax: !1,
					scrollbar: null,
					scrollbarHide: !0,
					keyboardControl: !1,
					mousewheelControl: !1,
					mousewheelReleaseOnEdges: !1,
					mousewheelInvert: !1,
					mousewheelForceToAxis: !1,
					mousewheelSensitivity: 1,
					hashnav: !1,
					spaceBetween: 0,
					slidesPerView: 1,
					slidesPerColumn: 1,
					slidesPerColumnFill: "column",
					slidesPerGroup: 1,
					centeredSlides: !1,
					slidesOffsetBefore: 0,
					slidesOffsetAfter: 0,
					roundLengths: !1,
					touchRatio: 1,
					touchAngle: 45,
					simulateTouch: !0,
					shortSwipes: !0,
					longSwipes: !0,
					longSwipesRatio: .5,
					longSwipesMs: 300,
					followFinger: !0,
					onlyExternal: !1,
					threshold: 0,
					touchMoveStopPropagation: !0,
					pagination: null,
					paginationElement: "span",
					paginationClickable: !1,
					paginationHide: !1,
					paginationBulletRender: null,
					resistance: !0,
					resistanceRatio: .85,
					nextButton: null,
					prevButton: null,
					watchSlidesProgress: !1,
					watchSlidesVisibility: !1,
					grabCursor: !1,
					preventClicks: !0,
					preventClicksPropagation: !0,
					slideToClickedSlide: !1,
					lazyLoading: !1,
					lazyLoadingInPrevNext: !1,
					lazyLoadingOnTransitionStart: !1,
					preloadImages: !0,
					updateOnImagesReady: !0,
					loop: !1,
					loopAdditionalSlides: 0,
					loopedSlides: null,
					control: void 0,
					controlInverse: !1,
					controlBy: "slide",
					allowSwipeToPrev: !0,
					allowSwipeToNext: !0,
					swipeHandler: null,
					noSwiping: !0,
					noSwipingClass: "swiper-no-swiping",
					slideClass: "swiper-slide",
					slideActiveClass: "swiper-slide-active",
					slideVisibleClass: "swiper-slide-visible",
					slideDuplicateClass: "swiper-slide-duplicate",
					slideNextClass: "swiper-slide-next",
					slidePrevClass: "swiper-slide-prev",
					wrapperClass: "swiper-wrapper",
					bulletClass: "swiper-pagination-bullet",
					bulletActiveClass: "swiper-pagination-bullet-active",
					buttonDisabledClass: "swiper-button-disabled",
					paginationHiddenClass: "swiper-pagination-hidden",
					observer: !1,
					observeParents: !1,
					a11y: !1,
					prevSlideMessage: "Previous slide",
					nextSlideMessage: "Next slide",
					firstSlideMessage: "This is the first slide",
					lastSlideMessage: "This is the last slide",
					paginationBulletMessage: "Go to slide {{index}}",
					runCallbacksOnInit: !0
				},
				h = s && s.virtualTranslate;
			s = s || {};
			for(var g in f)
				if("undefined" == typeof s[g]) s[g] = f[g];
				else if("object" == typeof s[g])
				for(var v in f[g]) "undefined" == typeof s[g][v] && (s[g][v] = f[g][v]);
			var w = this;
			if(w.version = "3.1.0", w.params = s, w.classNames = [], "undefined" != typeof a && "undefined" != typeof r && (a = r), ("undefined" != typeof a || (a = "undefined" == typeof r ? window.Dom7 || window.Zepto || window.jQuery : r)) && (w.$ = a, w.container = a(e), 0 !== w.container.length)) {
				if(w.container.length > 1) return void w.container.each(function() {
					new t(this, s)
				});
				w.container[0].swiper = w, w.container.data("swiper", w), w.classNames.push("swiper-container-" + w.params.direction), w.params.freeMode && w.classNames.push("swiper-container-free-mode"), w.support.flexbox || (w.classNames.push("swiper-container-no-flexbox"), w.params.slidesPerColumn = 1), (w.params.parallax || w.params.watchSlidesVisibility) && (w.params.watchSlidesProgress = !0), ["cube", "coverflow"].indexOf(w.params.effect) >= 0 && (w.support.transforms3d ? (w.params.watchSlidesProgress = !0, w.classNames.push("swiper-container-3d")) : w.params.effect = "slide"), "slide" !== w.params.effect && w.classNames.push("swiper-container-" + w.params.effect), "cube" === w.params.effect && (w.params.resistanceRatio = 0, w.params.slidesPerView = 1, w.params.slidesPerColumn = 1, w.params.slidesPerGroup = 1, w.params.centeredSlides = !1, w.params.spaceBetween = 0, w.params.virtualTranslate = !0, w.params.setWrapperSize = !1), "fade" === w.params.effect && (w.params.slidesPerView = 1, w.params.slidesPerColumn = 1, w.params.slidesPerGroup = 1, w.params.watchSlidesProgress = !0, w.params.spaceBetween = 0, "undefined" == typeof h && (w.params.virtualTranslate = !0)), w.params.grabCursor && w.support.touch && (w.params.grabCursor = !1), w.wrapper = w.container.children("." + w.params.wrapperClass), w.params.pagination && (w.paginationContainer = a(w.params.pagination), w.params.paginationClickable && w.paginationContainer.addClass("swiper-pagination-clickable")), w.rtl = i() && ("rtl" === w.container[0].dir.toLowerCase() || "rtl" === w.container.css("direction")), w.rtl && w.classNames.push("swiper-container-rtl"), w.rtl && (w.wrongRTL = "-webkit-box" === w.wrapper.css("display")), w.params.slidesPerColumn > 1 && w.classNames.push("swiper-container-multirow"), w.device.android && w.classNames.push("swiper-container-android"), w.container.addClass(w.classNames.join(" ")), w.translate = 0, w.progress = 0, w.velocity = 0, w.lockSwipeToNext = function() {
					w.params.allowSwipeToNext = !1
				}, w.lockSwipeToPrev = function() {
					w.params.allowSwipeToPrev = !1
				}, w.lockSwipes = function() {
					w.params.allowSwipeToNext = w.params.allowSwipeToPrev = !1
				}, w.unlockSwipeToNext = function() {
					w.params.allowSwipeToNext = !0
				}, w.unlockSwipeToPrev = function() {
					w.params.allowSwipeToPrev = !0
				}, w.unlockSwipes = function() {
					w.params.allowSwipeToNext = w.params.allowSwipeToPrev = !0
				}, w.params.grabCursor && (w.container[0].style.cursor = "move", w.container[0].style.cursor = "-webkit-grab", w.container[0].style.cursor = "-moz-grab", w.container[0].style.cursor = "grab"), w.imagesToLoad = [], w.imagesLoaded = 0, w.loadImage = function(e, a, t, r) {
					function s() {
						r && r()
					}
					var i;
					e.complete && t ? s() : a ? (i = new window.Image, i.onload = s, i.onerror = s, i.src = a) : s()
				}, w.preloadImages = function() {
					function e() {
						"undefined" != typeof w && null !== w && (void 0 !== w.imagesLoaded && w.imagesLoaded++, w.imagesLoaded === w.imagesToLoad.length && (w.params.updateOnImagesReady && w.update(), w.emit("onImagesReady", w)))
					}
					w.imagesToLoad = w.container.find("img");
					for(var a = 0; a < w.imagesToLoad.length; a++) w.loadImage(w.imagesToLoad[a], w.imagesToLoad[a].currentSrc || w.imagesToLoad[a].getAttribute("src"), !0, e)
				}, w.autoplayTimeoutId = void 0, w.autoplaying = !1, w.autoplayPaused = !1, w.startAutoplay = function() {
					return "undefined" != typeof w.autoplayTimeoutId ? !1 : w.params.autoplay ? w.autoplaying ? !1 : (w.autoplaying = !0, w.emit("onAutoplayStart", w), void o()) : !1
				}, w.stopAutoplay = function(e) {
					w.autoplayTimeoutId && (w.autoplayTimeoutId && clearTimeout(w.autoplayTimeoutId), w.autoplaying = !1, w.autoplayTimeoutId = void 0, w.emit("onAutoplayStop", w))
				}, w.pauseAutoplay = function(e) {
					w.autoplayPaused || (w.autoplayTimeoutId && clearTimeout(w.autoplayTimeoutId), w.autoplayPaused = !0, 0 === e ? (w.autoplayPaused = !1, o()) : w.wrapper.transitionEnd(function() {
						w && (w.autoplayPaused = !1, w.autoplaying ? o() : w.stopAutoplay())
					}))
				}, w.minTranslate = function() {
					return -w.snapGrid[0]
				}, w.maxTranslate = function() {
					return -w.snapGrid[w.snapGrid.length - 1]
				}, w.updateContainerSize = function() {
					var e, a;
					e = "undefined" != typeof w.params.width ? w.params.width : w.container[0].clientWidth, a = "undefined" != typeof w.params.height ? w.params.height : w.container[0].clientHeight, 0 === e && i() || 0 === a && !i() || (e = e - parseInt(w.container.css("padding-left"), 10) - parseInt(w.container.css("padding-right"), 10), a = a - parseInt(w.container.css("padding-top"), 10) - parseInt(w.container.css("padding-bottom"), 10), w.width = e, w.height = a, w.size = i() ? w.width : w.height)
				}, w.updateSlidesSize = function() {
					w.slides = w.wrapper.children("." + w.params.slideClass), w.snapGrid = [], w.slidesGrid = [], w.slidesSizesGrid = [];
					var e, a = w.params.spaceBetween,
						t = -w.params.slidesOffsetBefore,
						r = 0,
						s = 0;
					"string" == typeof a && a.indexOf("%") >= 0 && (a = parseFloat(a.replace("%", "")) / 100 * w.size), w.virtualSize = -a, w.slides.css(w.rtl ? {
						marginLeft: "",
						marginTop: ""
					} : {
						marginRight: "",
						marginBottom: ""
					});
					var o;
					w.params.slidesPerColumn > 1 && (o = Math.floor(w.slides.length / w.params.slidesPerColumn) === w.slides.length / w.params.slidesPerColumn ? w.slides.length : Math.ceil(w.slides.length / w.params.slidesPerColumn) * w.params.slidesPerColumn);
					var l, d = w.params.slidesPerColumn,
						p = o / d,
						u = p - (w.params.slidesPerColumn * p - w.slides.length);
					for(e = 0; e < w.slides.length; e++) {
						l = 0;
						var c = w.slides.eq(e);
						if(w.params.slidesPerColumn > 1) {
							var m, f, h;
							"column" === w.params.slidesPerColumnFill ? (f = Math.floor(e / d), h = e - f * d, (f > u || f === u && h === d - 1) && ++h >= d && (h = 0, f++), m = f + h * o / d, c.css({
								"-webkit-box-ordinal-group": m,
								"-moz-box-ordinal-group": m,
								"-ms-flex-order": m,
								"-webkit-order": m,
								order: m
							})) : (h = Math.floor(e / p), f = e - h * p), c.css({
								"margin-top": 0 !== h && w.params.spaceBetween && w.params.spaceBetween + "px"
							}).attr("data-swiper-column", f).attr("data-swiper-row", h)
						}
						"none" !== c.css("display") && ("auto" === w.params.slidesPerView ? (l = i() ? c.outerWidth(!0) : c.outerHeight(!0), w.params.roundLengths && (l = n(l))) : (l = (w.size - (w.params.slidesPerView -
							1) * a) / w.params.slidesPerView, w.params.roundLengths && (l = n(l)), i() ? w.slides[e].style.width = l + "px" : w.slides[e].style.height = l + "px"), w.slides[e].swiperSlideSize = l, w.slidesSizesGrid.push(l), w.params.centeredSlides ? (t = t + l / 2 + r / 2 + a, 0 === e && (t = t - w.size / 2 - a), Math.abs(t) < .001 && (t = 0), s % w.params.slidesPerGroup === 0 && w.snapGrid.push(t), w.slidesGrid.push(t)) : (s % w.params.slidesPerGroup === 0 && w.snapGrid.push(t), w.slidesGrid.push(t), t = t + l + a), w.virtualSize += l + a, r = l, s++)
					}
					w.virtualSize = Math.max(w.virtualSize, w.size) + w.params.slidesOffsetAfter;
					var g;
					if(w.rtl && w.wrongRTL && ("slide" === w.params.effect || "coverflow" === w.params.effect) && w.wrapper.css({
							width: w.virtualSize + w.params.spaceBetween + "px"
						}), (!w.support.flexbox || w.params.setWrapperSize) && w.wrapper.css(i() ? {
							width: w.virtualSize + w.params.spaceBetween + "px"
						} : {
							height: w.virtualSize + w.params.spaceBetween + "px"
						}), w.params.slidesPerColumn > 1 && (w.virtualSize = (l + w.params.spaceBetween) * o, w.virtualSize = Math.ceil(w.virtualSize / w.params.slidesPerColumn) - w.params.spaceBetween, w.wrapper.css({
							width: w.virtualSize + w.params.spaceBetween + "px"
						}), w.params.centeredSlides)) {
						for(g = [], e = 0; e < w.snapGrid.length; e++) w.snapGrid[e] < w.virtualSize + w.snapGrid[0] && g.push(w.snapGrid[e]);
						w.snapGrid = g
					}
					if(!w.params.centeredSlides) {
						for(g = [], e = 0; e < w.snapGrid.length; e++) w.snapGrid[e] <= w.virtualSize - w.size && g.push(w.snapGrid[e]);
						w.snapGrid = g, Math.floor(w.virtualSize - w.size) > Math.floor(w.snapGrid[w.snapGrid.length -
							1]) && w.snapGrid.push(w.virtualSize - w.size)
					}
					0 === w.snapGrid.length && (w.snapGrid = [0]), 0 !== w.params.spaceBetween && w.slides.css(i() ? w.rtl ? {
						marginLeft: a + "px"
					} : {
						marginRight: a + "px"
					} : {
						marginBottom: a + "px"
					}), w.params.watchSlidesProgress && w.updateSlidesOffset()
				}, w.updateSlidesOffset = function() {
					for(var e = 0; e < w.slides.length; e++) w.slides[e].swiperSlideOffset = i() ? w.slides[e].offsetLeft : w.slides[e].offsetTop
				}, w.updateSlidesProgress = function(e) {
					if("undefined" == typeof e && (e = w.translate || 0), 0 !== w.slides.length) {
						"undefined" == typeof w.slides[0].swiperSlideOffset && w.updateSlidesOffset();
						var a = -e;
						w.rtl && (a = e); {
							w.container[0].getBoundingClientRect(), i() ? "left" : "top", i() ? "right" : "bottom"
						}
						w.slides.removeClass(w.params.slideVisibleClass);
						for(var t = 0; t < w.slides.length; t++) {
							var r = w.slides[t],
								s = (a - r.swiperSlideOffset) / (r.swiperSlideSize + w.params.spaceBetween);
							if(w.params.watchSlidesVisibility) {
								var n = -(a - r.swiperSlideOffset),
									o = n + w.slidesSizesGrid[t],
									l = n >= 0 && n < w.size || o > 0 && o <= w.size || 0 >= n && o >= w.size;
								l && w.slides.eq(t).addClass(w.params.slideVisibleClass)
							}
							r.progress = w.rtl ? -s : s
						}
					}
				}, w.updateProgress = function(e) {
					"undefined" == typeof e && (e = w.translate || 0);
					var a = w.maxTranslate() - w.minTranslate();
					0 === a ? (w.progress = 0, w.isBeginning = w.isEnd = !0) : (w.progress = (e - w.minTranslate()) / a, w.isBeginning = w.progress <= 0, w.isEnd = w.progress >= 1), w.isBeginning && w.emit("onReachBeginning", w), w.isEnd && w.emit("onReachEnd", w), w.params.watchSlidesProgress && w.updateSlidesProgress(e), w.emit("onProgress", w, w.progress)
				}, w.updateActiveIndex = function() {
					var e, a, t, r = w.rtl ? w.translate : -w.translate;
					for(a = 0; a < w.slidesGrid.length; a++) "undefined" != typeof w.slidesGrid[a + 1] ? r >= w.slidesGrid[a] && r < w.slidesGrid[a + 1] - (w.slidesGrid[a + 1] - w.slidesGrid[a]) / 2 ? e = a : r >= w.slidesGrid[a] && r < w.slidesGrid[a + 1] && (e = a + 1) : r >= w.slidesGrid[a] && (e = a);
					(0 > e || "undefined" == typeof e) && (e = 0), t = Math.floor(e / w.params.slidesPerGroup), t >= w.snapGrid.length && (t = w.snapGrid.length - 1), e !== w.activeIndex && (w.snapIndex = t, w.previousIndex = w.activeIndex, w.activeIndex = e, w.updateClasses())
				}, w.updateClasses = function() {
					w.slides.removeClass(w.params.slideActiveClass + " " + w.params.slideNextClass + " " + w.params.slidePrevClass);
					var e = w.slides.eq(w.activeIndex);
					if(e.addClass(w.params.slideActiveClass), e.next("." + w.params.slideClass).addClass(w.params.slideNextClass), e.prev("." + w.params.slideClass).addClass(w.params.slidePrevClass), w.bullets && w.bullets.length > 0) {
						w.bullets.removeClass(w.params.bulletActiveClass);
						var t;
						w.params.loop ? (t = Math.ceil(w.activeIndex - w.loopedSlides) / w.params.slidesPerGroup, t > w.slides.length - 1 - 2 * w.loopedSlides && (t -= w.slides.length - 2 * w.loopedSlides), t > w.bullets.length - 1 && (t -= w.bullets.length)) : t = "undefined" != typeof w.snapIndex ? w.snapIndex : w.activeIndex || 0, w.paginationContainer.length > 1 ? w.bullets.each(function() {
							a(this).index() === t && a(this).addClass(w.params.bulletActiveClass)
						}) : w.bullets.eq(t).addClass(w.params.bulletActiveClass)
					}
					w.params.loop || (w.params.prevButton && (w.isBeginning ? (a(w.params.prevButton).addClass(w.params.buttonDisabledClass), w.params.a11y && w.a11y && w.a11y.disable(a(w.params.prevButton))) : (a(w.params.prevButton).removeClass(w.params.buttonDisabledClass), w.params.a11y && w.a11y && w.a11y.enable(a(w.params.prevButton)))), w.params.nextButton && (w.isEnd ? (a(w.params.nextButton).addClass(w.params.buttonDisabledClass), w.params.a11y && w.a11y && w.a11y.disable(a(w.params.nextButton))) : (a(w.params.nextButton).removeClass(w.params.buttonDisabledClass), w.params.a11y && w.a11y && w.a11y.enable(a(w.params.nextButton)))))
				}, w.updatePagination = function() {
					if(w.params.pagination && w.paginationContainer && w.paginationContainer.length > 0) {
						for(var e = "", a = w.params.loop ? Math.ceil((w.slides.length - 2 * w.loopedSlides) / w.params.slidesPerGroup) : w.snapGrid.length, t = 0; a > t; t++) e += w.params.paginationBulletRender ? w.params.paginationBulletRender(t, w.params.bulletClass) : "<" + w.params.paginationElement + ' class="' + w.params.bulletClass + '"></' + w.params.paginationElement + ">";
						w.paginationContainer.html(e), w.bullets = w.paginationContainer.find("." + w.params.bulletClass), w.params.paginationClickable && w.params.a11y && w.a11y && w.a11y.initPagination()
					}
				}, w.update = function(e) {
					function a() {
						r = Math.min(Math.max(w.translate, w.maxTranslate()), w.minTranslate()), w.setWrapperTranslate(r), w.updateActiveIndex(), w.updateClasses()
					}
					if(w.updateContainerSize(), w.updateSlidesSize(), w.updateProgress(), w.updatePagination(), w.updateClasses(), w.params.scrollbar && w.scrollbar && w.scrollbar.set(), e) {
						var t, r;
						w.controller && w.controller.spline && (w.controller.spline = void 0), w.params.freeMode ? a() : (t = ("auto" === w.params.slidesPerView || w.params.slidesPerView > 1) && w.isEnd && !w.params.centeredSlides ? w.slideTo(w.slides.length - 1, 0, !1, !0) : w.slideTo(w.activeIndex, 0, !1, !0), t || a())
					}
				}, w.onResize = function(e) {
					var a = w.params.allowSwipeToPrev,
						t = w.params.allowSwipeToNext;
					if(w.params.allowSwipeToPrev = w.params.allowSwipeToNext = !0, w.updateContainerSize(), w.updateSlidesSize(), ("auto" === w.params.slidesPerView || w.params.freeMode || e) && w.updatePagination(), w.params.scrollbar && w.scrollbar && w.scrollbar.set(), w.controller && w.controller.spline && (w.controller.spline = void 0), w.params.freeMode) {
						var r = Math.min(Math.max(w.translate, w.maxTranslate()), w.minTranslate());
						w.setWrapperTranslate(r), w.updateActiveIndex(), w.updateClasses()
					} else w.updateClasses(), ("auto" === w.params.slidesPerView || w.params.slidesPerView > 1) && w.isEnd && !w.params.centeredSlides ? w.slideTo(w.slides.length - 1, 0, !1, !0) : w.slideTo(w.activeIndex, 0, !1, !0);
					w.params.allowSwipeToPrev = a, w.params.allowSwipeToNext = t
				};
				var y = ["mousedown", "mousemove", "mouseup"];
				window.navigator.pointerEnabled ? y = ["pointerdown", "pointermove", "pointerup"] : window.navigator.msPointerEnabled && (y = ["MSPointerDown", "MSPointerMove", "MSPointerUp"]), w.touchEvents = {
					start: w.support.touch || !w.params.simulateTouch ? "touchstart" : y[0],
					move: w.support.touch || !w.params.simulateTouch ? "touchmove" : y[1],
					end: w.support.touch || !w.params.simulateTouch ? "touchend" : y[2]
				}, (window.navigator.pointerEnabled || window.navigator.msPointerEnabled) && ("container" === w.params.touchEventsTarget ? w.container : w.wrapper).addClass("swiper-wp8-" + w.params.direction), w.initEvents = function(e) {
					var t = e ? "off" : "on",
						r = e ? "removeEventListener" : "addEventListener",
						i = "container" === w.params.touchEventsTarget ? w.container[0] : w.wrapper[0],
						n = w.support.touch ? i : document,
						o = w.params.nested ? !0 : !1;
					w.browser.ie ? (i[r](w.touchEvents.start, w.onTouchStart, !1), n[r](w.touchEvents.move, w.onTouchMove, o), n[r](w.touchEvents.end, w.onTouchEnd, !1)) : (w.support.touch && (i[r](w.touchEvents.start, w.onTouchStart, !1), i[r](w.touchEvents.move, w.onTouchMove, o), i[r](w.touchEvents.end, w.onTouchEnd, !1)), !s.simulateTouch || w.device.ios || w.device.android || (i[r]("mousedown", w.onTouchStart, !1), document[r]("mousemove", w.onTouchMove, o), document[r]("mouseup", w.onTouchEnd, !1))), window[r]("resize", w.onResize), w.params.nextButton && (a(w.params.nextButton)[t]("click", w.onClickNext), w.params.a11y && w.a11y && a(w.params.nextButton)[t]("keydown", w.a11y.onEnterKey)), w.params.prevButton && (a(w.params.prevButton)[t]("click", w.onClickPrev), w.params.a11y && w.a11y && a(w.params.prevButton)[t]("keydown", w.a11y.onEnterKey)), w.params.pagination && w.params.paginationClickable && (a(w.paginationContainer)[t]("click", "." + w.params.bulletClass, w.onClickIndex), w.params.a11y && w.a11y && a(w.paginationContainer)[t]("keydown", "." + w.params.bulletClass, w.a11y.onEnterKey)), (w.params.preventClicks || w.params.preventClicksPropagation) && i[r]("click", w.preventClicks, !0)
				}, w.attachEvents = function(e) {
					w.initEvents()
				}, w.detachEvents = function() {
					w.initEvents(!0)
				}, w.allowClick = !0, w.preventClicks = function(e) {
					w.allowClick || (w.params.preventClicks && e.preventDefault(), w.params.preventClicksPropagation && w.animating && (e.stopPropagation(), e.stopImmediatePropagation()))
				}, w.onClickNext = function(e) {
					e.preventDefault(), (!w.isEnd || w.params.loop) && w.slideNext()
				}, w.onClickPrev = function(e) {
					e.preventDefault(), (!w.isBeginning || w.params.loop) && w.slidePrev()
				}, w.onClickIndex = function(e) {
					e.preventDefault();
					var t = a(this).index() * w.params.slidesPerGroup;
					w.params.loop && (t += w.loopedSlides), w.slideTo(t)
				}, w.updateClickedSlide = function(e) {
					var t = l(e, "." + w.params.slideClass),
						r = !1;
					if(t)
						for(var s = 0; s < w.slides.length; s++) w.slides[s] === t && (r = !0);
					if(!t || !r) return w.clickedSlide = void 0, void(w.clickedIndex = void 0);
					if(w.clickedSlide = t, w.clickedIndex = a(t).index(), w.params.slideToClickedSlide && void 0 !== w.clickedIndex && w.clickedIndex !== w.activeIndex) {
						var i, n = w.clickedIndex;
						if(w.params.loop)
							if(i = a(w.clickedSlide).attr("data-swiper-slide-index"), n > w.slides.length -
								w.params.slidesPerView) w.fixLoop(), n = w.wrapper.children("." + w.params.slideClass + '[data-swiper-slide-index="' + i + '"]').eq(0).index(), setTimeout(function() {
								w.slideTo(n)
							}, 0);
							else if(n < w.params.slidesPerView - 1) {
							w.fixLoop();
							var o = w.wrapper.children("." + w.params.slideClass + '[data-swiper-slide-index="' + i + '"]');
							n = o.eq(o.length - 1).index(), setTimeout(function() {
								w.slideTo(n)
							}, 0)
						} else w.slideTo(n);
						else w.slideTo(n)
					}
				};
				var b, x, T, S, C, M, E, P, z, I = "input, select, textarea, button",
					k = Date.now(),
					L = [];
				w.animating = !1, w.touches = {
					startX: 0,
					startY: 0,
					currentX: 0,
					currentY: 0,
					diff: 0
				};
				var D, B;
				if(w.onTouchStart = function(e) {
						if(e.originalEvent && (e = e.originalEvent), D = "touchstart" === e.type, D || !("which" in e) || 3 !== e.which) {
							if(w.params.noSwiping && l(e, "." + w.params.noSwipingClass)) return void(w.allowClick = !0);
							if(!w.params.swipeHandler || l(e, w.params.swipeHandler)) {
								var t = w.touches.currentX = "touchstart" === e.type ? e.targetTouches[0].pageX : e.pageX,
									r = w.touches.currentY = "touchstart" === e.type ? e.targetTouches[0].pageY : e.pageY;
								if(!(w.device.ios && w.params.iOSEdgeSwipeDetection && t <= w.params.iOSEdgeSwipeThreshold)) {
									if(b = !0, x = !1, S = void 0, B = void 0, w.touches.startX = t, w.touches.startY = r, T = Date.now(), w.allowClick = !0, w.updateContainerSize(), w.swipeDirection = void 0, w.params.threshold > 0 && (E = !1), "touchstart" !== e.type) {
										var s = !0;
										a(e.target).is(I) && (s = !1), document.activeElement && a(document.activeElement).is(I) && document.activeElement.blur(), s && e.preventDefault()
									}
									w.emit("onTouchStart", w, e)
								}
							}
						}
					}, w.onTouchMove = function(e) {
						if(e.originalEvent && (e = e.originalEvent), !(D && "mousemove" === e.type || e.preventedByNestedSwiper)) {
							if(w.params.onlyExternal) return w.allowClick = !1, void(b && (w.touches.startX = w.touches.currentX = "touchmove" === e.type ? e.targetTouches[0].pageX : e.pageX, w.touches.startY = w.touches.currentY = "touchmove" === e.type ? e.targetTouches[0].pageY : e.pageY, T = Date.now()));
							if(D && document.activeElement && e.target === document.activeElement && a(e.target).is(I))
								return x = !0, void(w.allowClick = !1);
							if(w.emit("onTouchMove", w, e), !(e.targetTouches && e.targetTouches.length > 1)) {
								if(w.touches.currentX = "touchmove" === e.type ? e.targetTouches[0].pageX : e.pageX, w.touches.currentY = "touchmove" === e.type ? e.targetTouches[0].pageY : e.pageY, "undefined" == typeof S) {
									var t = 180 * Math.atan2(Math.abs(w.touches.currentY - w.touches.startY), Math.abs(w.touches.currentX - w.touches.startX)) / Math.PI;
									S = i() ? t > w.params.touchAngle : 90 - t > w.params.touchAngle
								}
								if(S && w.emit("onTouchMoveOpposite", w, e), "undefined" == typeof B && w.browser.ieTouch && (w.touches.currentX !== w.touches.startX || w.touches.currentY !== w.touches.startY) && (B = !0), b) {
									if(S) return void(b = !1);
									if(B || !w.browser.ieTouch) {
										w.allowClick = !1, w.emit("onSliderMove", w, e), e.preventDefault(), w.params.touchMoveStopPropagation && !w.params.nested && e.stopPropagation(), x || (s.loop && w.fixLoop(), M = w.getWrapperTranslate(), w.setWrapperTransition(0), w.animating && w.wrapper.trigger("webkitTransitionEnd transitionend oTransitionEnd MSTransitionEnd msTransitionEnd"), w.params.autoplay && w.autoplaying && (w.params.autoplayDisableOnInteraction ? w.stopAutoplay() : w.pauseAutoplay()), z = !1, w.params.grabCursor && (w.container[0].style.cursor = "move", w.container[0].style.cursor = "-webkit-grabbing", w.container[0].style.cursor = "-moz-grabbin", w.container[0].style.cursor = "grabbing")), x = !0;
										var r = w.touches.diff = i() ? w.touches.currentX - w.touches.startX : w.touches.currentY -
											w.touches.startY;
										r *= w.params.touchRatio, w.rtl && (r = -r), w.swipeDirection = r > 0 ? "prev" : "next", C = r + M;
										var n = !0;
										if(r > 0 && C > w.minTranslate() ? (n = !1, w.params.resistance && (C = w.minTranslate() -
												1 + Math.pow(-w.minTranslate() + M + r, w.params.resistanceRatio))) : 0 > r && C < w.maxTranslate() && (n = !1, w.params.resistance && (C = w.maxTranslate() +
												1 - Math.pow(w.maxTranslate() - M - r, w.params.resistanceRatio))), n && (e.preventedByNestedSwiper = !0), !w.params.allowSwipeToNext && "next" === w.swipeDirection && M > C && (C = M), !w.params.allowSwipeToPrev && "prev" === w.swipeDirection && C > M && (C = M), w.params.followFinger) {
											if(w.params.threshold > 0) {
												if(!(Math.abs(r) > w.params.threshold || E)) return void(C = M);
												if(!E) return E = !0, w.touches.startX = w.touches.currentX, w.touches.startY = w.touches.currentY, C = M, void(w.touches.diff = i() ? w.touches.currentX -
													w.touches.startX : w.touches.currentY - w.touches.startY)
											}(w.params.freeMode || w.params.watchSlidesProgress) && w.updateActiveIndex(), w.params.freeMode && (0 === L.length && L.push({
												position: w.touches[i() ? "startX" : "startY"],
												time: T
											}), L.push({
												position: w.touches[i() ? "currentX" : "currentY"],
												time: (new window.Date).getTime()
											})), w.updateProgress(C), w.setWrapperTranslate(C)
										}
									}
								}
							}
						}
					}, w.onTouchEnd = function(e) {
						if(e.originalEvent && (e = e.originalEvent), w.emit("onTouchEnd", w, e), b) {
							w.params.grabCursor && x && b && (w.container[0].style.cursor = "move", w.container[0].style.cursor = "-webkit-grab", w.container[0].style.cursor = "-moz-grab", w.container[0].style.cursor = "grab");
							var t = Date.now(),
								r = t - T;
							if(w.allowClick && (w.updateClickedSlide(e), w.emit("onTap", w, e), 300 > r && t - k > 300 && (P && clearTimeout(P), P = setTimeout(function() {
									w && (w.params.paginationHide && w.paginationContainer.length > 0 && !a(e.target).hasClass(w.params.bulletClass) && w.paginationContainer.toggleClass(w.params.paginationHiddenClass), w.emit("onClick", w, e))
								}, 300)), 300 > r && 300 > t - k && (P && clearTimeout(P), w.emit("onDoubleTap", w, e))), k = Date.now(), setTimeout(function() {
									w && (w.allowClick = !0)
								}, 0), !b || !x || !w.swipeDirection || 0 === w.touches.diff || C === M) return void(b = x = !1);
							b = x = !1;
							var s;
							if(s = w.params.followFinger ? w.rtl ? w.translate : -w.translate : -C, w.params.freeMode) {
								if(s < -w.minTranslate()) return void w.slideTo(w.activeIndex);
								if(s > -w.maxTranslate()) return void w.slideTo(w.slides.length < w.snapGrid.length ? w.snapGrid.length - 1 : w.slides.length - 1);
								if(w.params.freeModeMomentum) {
									if(L.length > 1) {
										var i = L.pop(),
											n = L.pop(),
											o = i.position - n.position,
											l = i.time - n.time;
										w.velocity = o / l, w.velocity = w.velocity / 2, Math.abs(w.velocity) < .02 && (w.velocity = 0), (l > 150 || (new window.Date).getTime() - i.time > 300) && (w.velocity = 0)
									} else w.velocity = 0;
									L.length = 0;
									var d = 1e3 * w.params.freeModeMomentumRatio,
										p = w.velocity * d,
										u = w.translate + p;
									w.rtl && (u = -u);
									var c, m = !1,
										f = 20 * Math.abs(w.velocity) * w.params.freeModeMomentumBounceRatio;
									if(u < w.maxTranslate()) w.params.freeModeMomentumBounce ? (u + w.maxTranslate() < -f && (u = w.maxTranslate() - f), c = w.maxTranslate(), m = !0, z = !0) : u = w.maxTranslate();
									else if(u > w.minTranslate()) w.params.freeModeMomentumBounce ? (u - w.minTranslate() > f && (u = w.minTranslate() + f), c = w.minTranslate(), m = !0, z = !0) : u = w.minTranslate();
									else if(w.params.freeModeSticky) {
										var h, g = 0;
										for(g = 0; g < w.snapGrid.length; g += 1)
											if(w.snapGrid[g] > -u) {
												h = g;
												break
											}
										u = Math.abs(w.snapGrid[h] - u) < Math.abs(w.snapGrid[h - 1] - u) || "next" === w.swipeDirection ? w.snapGrid[h] : w.snapGrid[h - 1], w.rtl || (u = -u)
									}
									if(0 !== w.velocity) d = Math.abs(w.rtl ? (-u - w.translate) / w.velocity : (u - w.translate) / w.velocity);
									else if(w.params.freeModeSticky) return void w.slideReset();
									w.params.freeModeMomentumBounce && m ? (w.updateProgress(c), w.setWrapperTransition(d), w.setWrapperTranslate(u), w.onTransitionStart(), w.animating = !0, w.wrapper.transitionEnd(function() {
										w && z && (w.emit("onMomentumBounce", w), w.setWrapperTransition(w.params.speed), w.setWrapperTranslate(c), w.wrapper.transitionEnd(function() {
											w && w.onTransitionEnd()
										}))
									})) : w.velocity ? (w.updateProgress(u), w.setWrapperTransition(d), w.setWrapperTranslate(u), w.onTransitionStart(), w.animating || (w.animating = !0, w.wrapper.transitionEnd(function() {
										w && w.onTransitionEnd()
									}))) : w.updateProgress(u), w.updateActiveIndex()
								}
								return void((!w.params.freeModeMomentum || r >= w.params.longSwipesMs) && (w.updateProgress(), w.updateActiveIndex()))
							}
							var v, y = 0,
								S = w.slidesSizesGrid[0];
							for(v = 0; v < w.slidesGrid.length; v += w.params.slidesPerGroup) "undefined" != typeof w.slidesGrid[v + w.params.slidesPerGroup] ? s >= w.slidesGrid[v] && s < w.slidesGrid[v + w.params.slidesPerGroup] && (y = v, S = w.slidesGrid[v + w.params.slidesPerGroup] - w.slidesGrid[v]) : s >= w.slidesGrid[v] && (y = v, S = w.slidesGrid[w.slidesGrid.length - 1] - w.slidesGrid[w.slidesGrid.length -
								2]);
							var E = (s - w.slidesGrid[y]) / S;
							if(r > w.params.longSwipesMs) {
								if(!w.params.longSwipes) return void w.slideTo(w.activeIndex);
								"next" === w.swipeDirection && w.slideTo(E >= w.params.longSwipesRatio ? y + w.params.slidesPerGroup : y), "prev" === w.swipeDirection && w.slideTo(E > 1 - w.params.longSwipesRatio ? y + w.params.slidesPerGroup : y)
							} else {
								if(!w.params.shortSwipes) return void w.slideTo(w.activeIndex);
								"next" === w.swipeDirection && w.slideTo(y + w.params.slidesPerGroup), "prev" === w.swipeDirection && w.slideTo(y)
							}
						}
					}, w._slideTo = function(e, a) {
						return w.slideTo(e, a, !0, !0)
					}, w.slideTo = function(e, a, t, r) {
						"undefined" == typeof t && (t = !0), "undefined" == typeof e && (e = 0), 0 > e && (e = 0), w.snapIndex = Math.floor(e / w.params.slidesPerGroup), w.snapIndex >= w.snapGrid.length && (w.snapIndex = w.snapGrid.length - 1);
						var s = -w.snapGrid[w.snapIndex];
						w.params.autoplay && w.autoplaying && (r || !w.params.autoplayDisableOnInteraction ? w.pauseAutoplay(a) : w.stopAutoplay()), w.updateProgress(s);
						for(var n = 0; n < w.slidesGrid.length; n++) - Math.floor(100 * s) >= Math.floor(100 * w.slidesGrid[n]) && (e = n);
						if(!w.params.allowSwipeToNext && s < w.translate && s < w.minTranslate()) return !1;
						if(!w.params.allowSwipeToPrev && s > w.translate && s > w.maxTranslate() && (w.activeIndex || 0) !== e) return !1;
						if("undefined" == typeof a && (a = w.params.speed), w.previousIndex = w.activeIndex || 0, w.activeIndex = e, s === w.translate) return w.updateClasses(), !1;
						w.updateClasses(), w.onTransitionStart(t);
						i() ? s : 0, i() ? 0 : s;
						return 0 === a ? (w.setWrapperTransition(0), w.setWrapperTranslate(s), w.onTransitionEnd(t)) : (w.setWrapperTransition(a), w.setWrapperTranslate(s), w.animating || (w.animating = !0, w.wrapper.transitionEnd(function() {
							w && w.onTransitionEnd(t)
						}))), !0
					}, w.onTransitionStart = function(e) {
						"undefined" == typeof e && (e = !0), w.lazy && w.lazy.onTransitionStart(), e && (w.emit("onTransitionStart", w), w.activeIndex !== w.previousIndex && w.emit("onSlideChangeStart", w))
					}, w.onTransitionEnd = function(e) {
						w.animating = !1, w.setWrapperTransition(0), "undefined" == typeof e && (e = !0), w.lazy && w.lazy.onTransitionEnd(), e && (w.emit("onTransitionEnd", w), w.activeIndex !== w.previousIndex && w.emit("onSlideChangeEnd", w)), w.params.hashnav && w.hashnav && w.hashnav.setHash()
					}, w.slideNext = function(e, a, t) {
						if(w.params.loop) {
							if(w.animating) return !1;
							w.fixLoop(); {
								w.container[0].clientLeft
							}
							return w.slideTo(w.activeIndex + w.params.slidesPerGroup, a, e, t)
						}
						return w.slideTo(w.activeIndex + w.params.slidesPerGroup, a, e, t)
					}, w._slideNext = function(e) {
						return w.slideNext(!0, e, !0)
					}, w.slidePrev = function(e, a, t) {
						if(w.params.loop) {
							if(w.animating) return !1;
							w.fixLoop(); {
								w.container[0].clientLeft
							}
							return w.slideTo(w.activeIndex - 1, a, e, t)
						}
						return w.slideTo(w.activeIndex - 1, a, e, t)
					}, w._slidePrev = function(e) {
						return w.slidePrev(!0, e, !0)
					}, w.slideReset = function(e, a, t) {
						return w.slideTo(w.activeIndex, a, e)
					}, w.setWrapperTransition = function(e, a) {
						w.wrapper.transition(e), "slide" !== w.params.effect && w.effects[w.params.effect] && w.effects[w.params.effect].setTransition(e), w.params.parallax && w.parallax && w.parallax.setTransition(e), w.params.scrollbar && w.scrollbar && w.scrollbar.setTransition(e), w.params.control && w.controller && w.controller.setTransition(e, a), w.emit("onSetTransition", w, e)
					}, w.setWrapperTranslate = function(e, a, t) {
						var r = 0,
							s = 0,
							n = 0;
						i() ? r = w.rtl ? -e : e : s = e, w.params.virtualTranslate || w.wrapper.transform(w.support.transforms3d ? "translate3d(" + r + "px, " + s + "px, " + n + "px)" : "translate(" + r + "px, " + s + "px)"), w.translate = i() ? r : s, a && w.updateActiveIndex(), "slide" !== w.params.effect && w.effects[w.params.effect] && w.effects[w.params.effect].setTranslate(w.translate), w.params.parallax && w.parallax && w.parallax.setTranslate(w.translate), w.params.scrollbar && w.scrollbar && w.scrollbar.setTranslate(w.translate), w.params.control && w.controller && w.controller.setTranslate(w.translate, t), w.emit("onSetTranslate", w, w.translate)
					}, w.getTranslate = function(e, a) {
						var t, r, s, i;
						return "undefined" == typeof a && (a = "x"), w.params.virtualTranslate ? w.rtl ? -w.translate : w.translate : (s = window.getComputedStyle(e, null), window.WebKitCSSMatrix ? i = new window.WebKitCSSMatrix("none" === s.webkitTransform ? "" : s.webkitTransform) : (i = s.MozTransform || s.OTransform || s.MsTransform || s.msTransform || s.transform || s.getPropertyValue("transform").replace("translate(", "matrix(1, 0, 0, 1,"), t = i.toString().split(",")), "x" === a && (r = window.WebKitCSSMatrix ? i.m41 : parseFloat(16 === t.length ? t[12] : t[4])), "y" === a && (r = window.WebKitCSSMatrix ? i.m42 : parseFloat(16 === t.length ? t[13] : t[5])), w.rtl && r && (r = -r), r || 0)
					}, w.getWrapperTranslate = function(e) {
						return "undefined" == typeof e && (e = i() ? "x" : "y"), w.getTranslate(w.wrapper[0], e)
					}, w.observers = [], w.initObservers = function() {
						if(w.params.observeParents)
							for(var e = w.container.parents(), a = 0; a < e.length; a++) d(e[a]);
						d(w.container[0], {
							childList: !1
						}), d(w.wrapper[0], {
							attributes: !1
						})
					}, w.disconnectObservers = function() {
						for(var e = 0; e < w.observers.length; e++) w.observers[e].disconnect();
						w.observers = []
					}, w.createLoop = function() {
						w.wrapper.children("." + w.params.slideClass + "." + w.params.slideDuplicateClass).remove();
						var e = w.wrapper.children("." + w.params.slideClass);
						"auto" !== w.params.slidesPerView || w.params.loopedSlides || (w.params.loopedSlides = e.length), w.loopedSlides = parseInt(w.params.loopedSlides || w.params.slidesPerView, 10), w.loopedSlides = w.loopedSlides + w.params.loopAdditionalSlides, w.loopedSlides > e.length && (w.loopedSlides = e.length);
						var t, r = [],
							s = [];
						for(e.each(function(t, i) {
								var n = a(this);
								t < w.loopedSlides && s.push(i), t < e.length && t >= e.length - w.loopedSlides && r.push(i), n.attr("data-swiper-slide-index", t)
							}), t = 0; t < s.length; t++) w.wrapper.append(a(s[t].cloneNode(!0)).addClass(w.params.slideDuplicateClass));
						for(t = r.length - 1; t >= 0; t--) w.wrapper.prepend(a(r[t].cloneNode(!0)).addClass(w.params.slideDuplicateClass))
					}, w.destroyLoop = function() {
						w.wrapper.children("." + w.params.slideClass + "." + w.params.slideDuplicateClass).remove(), w.slides.removeAttr("data-swiper-slide-index")
					}, w.fixLoop = function() {
						var e;
						w.activeIndex < w.loopedSlides ? (e = w.slides.length - 3 * w.loopedSlides + w.activeIndex, e += w.loopedSlides, w.slideTo(e, 0, !1, !0)) : ("auto" === w.params.slidesPerView && w.activeIndex >= 2 * w.loopedSlides || w.activeIndex > w.slides.length - 2 * w.params.slidesPerView) && (e = -w.slides.length + w.activeIndex +
							w.loopedSlides, e += w.loopedSlides, w.slideTo(e, 0, !1, !0))
					}, w.appendSlide = function(e) {
						if(w.params.loop && w.destroyLoop(), "object" == typeof e && e.length)
							for(var a = 0; a < e.length; a++)
								e[a] && w.wrapper.append(e[a]);
						else w.wrapper.append(e);
						w.params.loop && w.createLoop(), w.params.observer && w.support.observer || w.update(!0)
					}, w.prependSlide = function(e) {
						w.params.loop && w.destroyLoop();
						var a = w.activeIndex + 1;
						if("object" == typeof e && e.length) {
							for(var t = 0; t < e.length; t++) e[t] && w.wrapper.prepend(e[t]);
							a = w.activeIndex + e.length
						} else w.wrapper.prepend(e);
						w.params.loop && w.createLoop(), w.params.observer && w.support.observer || w.update(!0), w.slideTo(a, 0, !1)
					}, w.removeSlide = function(e) {
						w.params.loop && (w.destroyLoop(), w.slides = w.wrapper.children("." + w.params.slideClass));
						var a, t = w.activeIndex;
						if("object" == typeof e && e.length) {
							for(var r = 0; r < e.length; r++) a = e[r], w.slides[a] && w.slides.eq(a).remove(), t > a && t--;
							t = Math.max(t, 0)
						} else a = e, w.slides[a] && w.slides.eq(a).remove(), t > a && t--, t = Math.max(t, 0);
						w.params.loop && w.createLoop(), w.params.observer && w.support.observer || w.update(!0), w.params.loop ? w.slideTo(t + w.loopedSlides, 0, !1) : w.slideTo(t, 0, !1)
					}, w.removeAllSlides = function() {
						for(var e = [], a = 0; a < w.slides.length; a++) e.push(a);
						w.removeSlide(e)
					}, w.effects = {
						fade: {
							setTranslate: function() {
								for(var e = 0; e < w.slides.length; e++) {
									var a = w.slides.eq(e),
										t = a[0].swiperSlideOffset,
										r = -t;
									w.params.virtualTranslate || (r -= w.translate);
									var s = 0;
									i() || (s = r, r = 0);
									var n = w.params.fade.crossFade ? Math.max(1 - Math.abs(a[0].progress), 0) : 1 + Math.min(Math.max(a[0].progress, -1), 0);
									a.css({
										opacity: n
									}).transform("translate3d(" + r + "px, " + s + "px, 0px)")
								}
							},
							setTransition: function(e) {
								if(w.slides.transition(e), w.params.virtualTranslate && 0 !== e) {
									var a = !1;
									w.slides.transitionEnd(function() {
										if(!a && w) {
											a = !0, w.animating = !1;
											for(var e = ["webkitTransitionEnd", "transitionend", "oTransitionEnd", "MSTransitionEnd", "msTransitionEnd"], t = 0; t < e.length; t++) w.wrapper.trigger(e[t])
										}
									})
								}
							}
						},
						cube: {
							setTranslate: function() {
								var e, t = 0;
								w.params.cube.shadow && (i() ? (e = w.wrapper.find(".swiper-cube-shadow"), 0 === e.length && (e = a('<div class="swiper-cube-shadow"></div>'), w.wrapper.append(e)), e.css({
									height: w.width + "px"
								})) : (e = w.container.find(".swiper-cube-shadow"), 0 === e.length && (e = a('<div class="swiper-cube-shadow"></div>'), w.container.append(e))));
								for(var r = 0; r < w.slides.length; r++) {
									var s = w.slides.eq(r),
										n = 90 * r,
										o = Math.floor(n / 360);
									w.rtl && (n = -n, o = Math.floor(-n / 360));
									var l = Math.max(Math.min(s[0].progress, 1), -1),
										d = 0,
										p = 0,
										u = 0;
									r % 4 === 0 ? (d = 4 * -o * w.size, u = 0) : (r - 1) % 4 === 0 ? (d = 0, u = 4 * -o * w.size) : (r - 2) % 4 === 0 ? (d = w.size + 4 * o * w.size, u = w.size) : (r - 3) % 4 === 0 && (d = -w.size, u = 3 * w.size + 4 * w.size * o), w.rtl && (d = -d), i() || (p = d, d = 0);
									var c = "rotateX(" + (i() ? 0 : -n) + "deg) rotateY(" + (i() ? n : 0) + "deg) translate3d(" + d + "px, " + p + "px, " + u + "px)";
									if(1 >= l && l > -1 && (t = 90 * r + 90 * l, w.rtl && (t = 90 * -r - 90 * l)), s.transform(c), w.params.cube.slideShadows) {
										var m = s.find(i() ? ".swiper-slide-shadow-left" : ".swiper-slide-shadow-top"),
											f = s.find(i() ? ".swiper-slide-shadow-right" : ".swiper-slide-shadow-bottom");
										0 === m.length && (m = a('<div class="swiper-slide-shadow-' + (i() ? "left" : "top") + '"></div>'), s.append(m)), 0 === f.length && (f = a('<div class="swiper-slide-shadow-' + (i() ? "right" : "bottom") + '"></div>'), s.append(f)); {
											s[0].progress
										}
										m.length && (m[0].style.opacity = -s[0].progress), f.length && (f[0].style.opacity = s[0].progress)
									}
								}
								if(w.wrapper.css({
										"-webkit-transform-origin": "50% 50% -" + w.size / 2 + "px",
										"-moz-transform-origin": "50% 50% -" + w.size / 2 + "px",
										"-ms-transform-origin": "50% 50% -" + w.size / 2 + "px",
										"transform-origin": "50% 50% -" + w.size / 2 + "px"
									}), w.params.cube.shadow)
									if(i()) e.transform("translate3d(0px, " + (w.width / 2 + w.params.cube.shadowOffset) + "px, " + -w.width / 2 + "px) rotateX(90deg) rotateZ(0deg) scale(" + w.params.cube.shadowScale + ")");
									else {
										var h = Math.abs(t) - 90 * Math.floor(Math.abs(t) / 90),
											g = 1.5 - (Math.sin(2 * h * Math.PI / 360) / 2 + Math.cos(2 * h * Math.PI / 360) / 2),
											v = w.params.cube.shadowScale,
											y = w.params.cube.shadowScale / g,
											b = w.params.cube.shadowOffset;
										e.transform("scale3d(" + v + ", 1, " + y + ") translate3d(0px, " + (w.height / 2 +
											b) + "px, " + -w.height / 2 / y + "px) rotateX(-90deg)")
									}
								var x = w.isSafari || w.isUiWebView ? -w.size / 2 : 0;
								w.wrapper.transform("translate3d(0px,0," + x + "px) rotateX(" + (i() ? 0 : t) + "deg) rotateY(" + (i() ? -t : 0) + "deg)")
							},
							setTransition: function(e) {
								w.slides.transition(e).find(".swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left").transition(e), w.params.cube.shadow && !i() && w.container.find(".swiper-cube-shadow").transition(e)
							}
						},
						coverflow: {
							setTranslate: function() {
								for(var e = w.translate, t = i() ? -e + w.width / 2 : -e + w.height / 2, r = i() ? w.params.coverflow.rotate : -w.params.coverflow.rotate, s = w.params.coverflow.depth, n = 0, o = w.slides.length; o > n; n++) {
									var l = w.slides.eq(n),
										d = w.slidesSizesGrid[n],
										p = l[0].swiperSlideOffset,
										u = (t - p - d / 2) / d * w.params.coverflow.modifier,
										c = i() ? r * u : 0,
										m = i() ? 0 : r * u,
										f = -s * Math.abs(u),
										h = i() ? 0 : w.params.coverflow.stretch * u,
										g = i() ? w.params.coverflow.stretch * u : 0;
									Math.abs(g) < .001 && (g = 0), Math.abs(h) < .001 && (h = 0), Math.abs(f) < .001 && (f = 0), Math.abs(c) < .001 && (c = 0), Math.abs(m) < .001 && (m = 0);
									var v = "translate3d(" + g + "px," + h + "px," + f + "px)  rotateX(" + m + "deg) rotateY(" + c + "deg)";
									if(l.transform(v), l[0].style.zIndex = -Math.abs(Math.round(u)) + 1, w.params.coverflow.slideShadows) {
										var y = l.find(i() ? ".swiper-slide-shadow-left" : ".swiper-slide-shadow-top"),
											b = l.find(i() ? ".swiper-slide-shadow-right" : ".swiper-slide-shadow-bottom");
										0 === y.length && (y = a('<div class="swiper-slide-shadow-' + (i() ? "left" : "top") + '"></div>'), l.append(y)), 0 === b.length && (b = a('<div class="swiper-slide-shadow-' + (i() ? "right" : "bottom") + '"></div>'), l.append(b)), y.length && (y[0].style.opacity = u > 0 ? u : 0), b.length && (b[0].style.opacity = -u > 0 ? -u : 0)
									}
								}
								if(w.browser.ie) {
									var x = w.wrapper[0].style;
									x.perspectiveOrigin = t + "px 50%"
								}
							},
							setTransition: function(e) {
								w.slides.transition(e).find(".swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left").transition(e)
							}
						}
					}, w.lazy = {
						initialImageLoaded: !1,
						loadImageInSlide: function(e, t) {
							if("undefined" != typeof e && ("undefined" == typeof t && (t = !0), 0 !== w.slides.length)) {
								var r = w.slides.eq(e),
									s = r.find(".swiper-lazy:not(.swiper-lazy-loaded):not(.swiper-lazy-loading)");
								!r.hasClass("swiper-lazy") || r.hasClass("swiper-lazy-loaded") || r.hasClass("swiper-lazy-loading") || s.add(r[0]), 0 !== s.length && s.each(function() {
									var e = a(this);
									e.addClass("swiper-lazy-loading");
									var s = e.attr("data-background"),
										i = e.attr("data-src");
									w.loadImage(e[0], i || s, !1, function() {
										if(s ? (e.css("background-image", "url(" + s + ")"), e.removeAttr("data-background")) : (e.attr("src", i), e.removeAttr("data-src")), e.addClass("swiper-lazy-loaded").removeClass("swiper-lazy-loading"), r.find(".swiper-lazy-preloader, .preloader").remove(), w.params.loop && t) {
											var a = r.attr("data-swiper-slide-index");
											if(r.hasClass(w.params.slideDuplicateClass)) {
												var n = w.wrapper.children('[data-swiper-slide-index="' + a + '"]:not(.' +
													w.params.slideDuplicateClass + ")");
												w.lazy.loadImageInSlide(n.index(), !1)
											} else {
												var o = w.wrapper.children("." + w.params.slideDuplicateClass + '[data-swiper-slide-index="' + a + '"]');
												w.lazy.loadImageInSlide(o.index(), !1)
											}
										}
										w.emit("onLazyImageReady", w, r[0], e[0])
									}), w.emit("onLazyImageLoad", w, r[0], e[0])
								})
							}
						},
						load: function() {
							var e;
							if(w.params.watchSlidesVisibility) w.wrapper.children("." + w.params.slideVisibleClass).each(function() {
								w.lazy.loadImageInSlide(a(this).index())
							});
							else if(w.params.slidesPerView > 1)
								for(e = w.activeIndex; e < w.activeIndex + w.params.slidesPerView; e++)
									w.slides[e] && w.lazy.loadImageInSlide(e);
							else w.lazy.loadImageInSlide(w.activeIndex);
							if(w.params.lazyLoadingInPrevNext)
								if(w.params.slidesPerView > 1) {
									for(e = w.activeIndex + w.params.slidesPerView; e < w.activeIndex + w.params.slidesPerView +
										w.params.slidesPerView; e++) w.slides[e] && w.lazy.loadImageInSlide(e);
									for(e = w.activeIndex - w.params.slidesPerView; e < w.activeIndex; e++) w.slides[e] && w.lazy.loadImageInSlide(e)
								} else {
									var t = w.wrapper.children("." + w.params.slideNextClass);
									t.length > 0 && w.lazy.loadImageInSlide(t.index());
									var r = w.wrapper.children("." + w.params.slidePrevClass);
									r.length > 0 && w.lazy.loadImageInSlide(r.index())
								}
						},
						onTransitionStart: function() {
							w.params.lazyLoading && (w.params.lazyLoadingOnTransitionStart || !w.params.lazyLoadingOnTransitionStart && !w.lazy.initialImageLoaded) && w.lazy.load()
						},
						onTransitionEnd: function() {
							w.params.lazyLoading && !w.params.lazyLoadingOnTransitionStart && w.lazy.load()
						}
					}, w.scrollbar = {
						set: function() {
							if(w.params.scrollbar) {
								var e = w.scrollbar;
								e.track = a(w.params.scrollbar), e.drag = e.track.find(".swiper-scrollbar-drag"), 0 === e.drag.length && (e.drag = a('<div class="swiper-scrollbar-drag"></div>'), e.track.append(e.drag)), e.drag[0].style.width = "", e.drag[0].style.height = "", e.trackSize = i() ? e.track[0].offsetWidth : e.track[0].offsetHeight, e.divider = w.size / w.virtualSize, e.moveDivider = e.divider * (e.trackSize / w.size), e.dragSize = e.trackSize * e.divider, i() ? e.drag[0].style.width = e.dragSize + "px" : e.drag[0].style.height = e.dragSize + "px", e.track[0].style.display = e.divider >= 1 ? "none" : "", w.params.scrollbarHide && (e.track[0].style.opacity = 0)
							}
						},
						setTranslate: function() {
							if(w.params.scrollbar) {
								var e, a = w.scrollbar,
									t = (w.translate || 0, a.dragSize);
								e = (a.trackSize - a.dragSize) * w.progress, w.rtl && i() ? (e = -e, e > 0 ? (t = a.dragSize -
									e, e = 0) : -e + a.dragSize > a.trackSize && (t = a.trackSize + e)) : 0 > e ? (t = a.dragSize +
									e, e = 0) : e + a.dragSize > a.trackSize && (t = a.trackSize - e), i() ? (a.drag.transform(w.support.transforms3d ? "translate3d(" + e + "px, 0, 0)" : "translateX(" + e + "px)"), a.drag[0].style.width = t + "px") : (a.drag.transform(w.support.transforms3d ? "translate3d(0px, " + e + "px, 0)" : "translateY(" + e + "px)"), a.drag[0].style.height = t + "px"), w.params.scrollbarHide && (clearTimeout(a.timeout), a.track[0].style.opacity = 1, a.timeout = setTimeout(function() {
									a.track[0].style.opacity = 0, a.track.transition(400)
								}, 1e3))
							}
						},
						setTransition: function(e) {
							w.params.scrollbar && w.scrollbar.drag.transition(e)
						}
					}, w.controller = {
						LinearSpline: function(e, a) {
							this.x = e, this.y = a, this.lastIndex = e.length - 1; {
								var t, r;
								this.x.length
							}
							this.interpolate = function(e) {
								return e ? (r = s(this.x, e), t = r - 1, (e - this.x[t]) * (this.y[r] - this.y[t]) / (this.x[r] - this.x[t]) + this.y[t]) : 0
							};
							var s = function() {
								var e, a, t;
								return function(r, s) {
									for(a = -1, e = r.length; e - a > 1;) r[t = e + a >> 1] <= s ? a = t : e = t;
									return e
								}
							}()
						},
						getInterpolateFunction: function(e) {
							w.controller.spline || (w.controller.spline = w.params.loop ? new w.controller.LinearSpline(w.slidesGrid, e.slidesGrid) : new w.controller.LinearSpline(w.snapGrid, e.snapGrid))
						},
						setTranslate: function(e, a) {
							function r(a) {
								e = a.rtl && "horizontal" === a.params.direction ? -w.translate : w.translate, "slide" === w.params.controlBy && (w.controller.getInterpolateFunction(a), i = -w.controller.spline.interpolate(-e)), i && "container" !== w.params.controlBy || (s = (a.maxTranslate() -
									a.minTranslate()) / (w.maxTranslate() - w.minTranslate()), i = (e - w.minTranslate()) * s + a.minTranslate()), w.params.controlInverse && (i = a.maxTranslate() - i), a.updateProgress(i), a.setWrapperTranslate(i, !1, w), a.updateActiveIndex()
							}
							var s, i, n = w.params.control;
							if(w.isArray(n))
								for(var o = 0; o < n.length; o++) n[o] !== a && n[o] instanceof t && r(n[o]);
							else n instanceof t && a !== n && r(n)
						},
						setTransition: function(e, a) {
							function r(a) {
								a.setWrapperTransition(e, w), 0 !== e && (a.onTransitionStart(), a.wrapper.transitionEnd(function() {
									i && (a.params.loop && "slide" === w.params.controlBy && a.fixLoop(), a.onTransitionEnd())
								}))
							}
							var s, i = w.params.control;
							if(w.isArray(i))
								for(s = 0; s < i.length; s++) i[s] !== a && i[s] instanceof t && r(i[s]);
							else i instanceof t && a !== i && r(i)
						}
					}, w.hashnav = {
						init: function() {
							if(w.params.hashnav) {
								w.hashnav.initialized = !0;
								var e = document.location.hash.replace("#", "");
								if(e)
									for(var a = 0, t = 0, r = w.slides.length; r > t; t++) {
										var s = w.slides.eq(t),
											i = s.attr("data-hash");
										if(i === e && !s.hasClass(w.params.slideDuplicateClass)) {
											var n = s.index();
											w.slideTo(n, a, w.params.runCallbacksOnInit, !0)
										}
									}
							}
						},
						setHash: function() {
							w.hashnav.initialized && w.params.hashnav && (document.location.hash = w.slides.eq(w.activeIndex).attr("data-hash") || "")
						}
					}, w.disableKeyboardControl = function() {
						a(document).off("keydown", p)
					}, w.enableKeyboardControl = function() {
						a(document).on("keydown", p)
					}, w.mousewheel = {
						event: !1,
						lastScrollTime: (new window.Date).getTime()
					}, w.params.mousewheelControl) {
					try {
						new window.WheelEvent("wheel"), w.mousewheel.event = "wheel"
					} catch(G) {}
					w.mousewheel.event || void 0 === document.onmousewheel || (w.mousewheel.event = "mousewheel"), w.mousewheel.event || (w.mousewheel.event = "DOMMouseScroll")
				}
				w.disableMousewheelControl = function() {
					return w.mousewheel.event ? (w.container.off(w.mousewheel.event, u), !0) : !1
				}, w.enableMousewheelControl = function() {
					return w.mousewheel.event ? (w.container.on(w.mousewheel.event, u), !0) : !1
				}, w.parallax = {
					setTranslate: function() {
						w.container.children("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function() {
							c(this, w.progress)
						}), w.slides.each(function() {
							var e = a(this);
							e.find("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function() {
								var a = Math.min(Math.max(e[0].progress, -1), 1);
								c(this, a)
							})
						})
					},
					setTransition: function(e) {
						"undefined" == typeof e && (e = w.params.speed), w.container.find("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function() {
							var t = a(this),
								r = parseInt(t.attr("data-swiper-parallax-duration"), 10) || e;
							0 === e && (r = 0), t.transition(r)
						})
					}
				}, w._plugins = [];
				for(var O in w.plugins) {
					var A = w.plugins[O](w, w.params[O]);
					A && w._plugins.push(A)
				}
				return w.callPlugins = function(e) {
					for(var a = 0; a < w._plugins.length; a++) e in w._plugins[a] && w._plugins[a][e](arguments[1], arguments[2], arguments[3], arguments[4], arguments[5])
				}, w.emitterEventListeners = {}, w.emit = function(e) {
					w.params[e] && w.params[e](arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
					var a;
					if(w.emitterEventListeners[e])
						for(a = 0; a < w.emitterEventListeners[e].length; a++) w.emitterEventListeners[e][a](arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
					w.callPlugins && w.callPlugins(e, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5])
				}, w.on = function(e, a) {
					return e = m(e), w.emitterEventListeners[e] || (w.emitterEventListeners[e] = []), w.emitterEventListeners[e].push(a), w
				}, w.off = function(e, a) {
					var t;
					if(e = m(e), "undefined" == typeof a) return w.emitterEventListeners[e] = [], w;
					if(w.emitterEventListeners[e] && 0 !== w.emitterEventListeners[e].length) {
						for(t = 0; t < w.emitterEventListeners[e].length; t++) w.emitterEventListeners[e][t] === a && w.emitterEventListeners[e].splice(t, 1);
						return w
					}
				}, w.once = function(e, a) {
					e = m(e);
					var t = function() {
						a(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]), w.off(e, t)
					};
					return w.on(e, t), w
				}, w.a11y = {
					makeFocusable: function(e) {
						return e.attr("tabIndex", "0"), e
					},
					addRole: function(e, a) {
						return e.attr("role", a), e
					},
					addLabel: function(e, a) {
						return e.attr("aria-label", a), e
					},
					disable: function(e) {
						return e.attr("aria-disabled", !0), e
					},
					enable: function(e) {
						return e.attr("aria-disabled", !1), e
					},
					onEnterKey: function(e) {
						13 === e.keyCode && (a(e.target).is(w.params.nextButton) ? (w.onClickNext(e), w.a11y.notify(w.isEnd ? w.params.lastSlideMessage : w.params.nextSlideMessage)) : a(e.target).is(w.params.prevButton) && (w.onClickPrev(e), w.a11y.notify(w.isBeginning ? w.params.firstSlideMessage : w.params.prevSlideMessage)), a(e.target).is("." + w.params.bulletClass) && a(e.target)[0].click())
					},
					liveRegion: a('<span class="swiper-notification" aria-live="assertive" aria-atomic="true"></span>'),
					notify: function(e) {
						var a = w.a11y.liveRegion;
						0 !== a.length && (a.html(""), a.html(e))
					},
					init: function() {
						if(w.params.nextButton) {
							var e = a(w.params.nextButton);
							w.a11y.makeFocusable(e), w.a11y.addRole(e, "button"), w.a11y.addLabel(e, w.params.nextSlideMessage)
						}
						if(w.params.prevButton) {
							var t = a(w.params.prevButton);
							w.a11y.makeFocusable(t), w.a11y.addRole(t, "button"), w.a11y.addLabel(t, w.params.prevSlideMessage)
						}
						a(w.container).append(w.a11y.liveRegion)
					},
					initPagination: function() {
						w.params.pagination && w.params.paginationClickable && w.bullets && w.bullets.length && w.bullets.each(function() {
							var e = a(this);
							w.a11y.makeFocusable(e), w.a11y.addRole(e, "button"), w.a11y.addLabel(e, w.params.paginationBulletMessage.replace(/{{index}}/, e.index() + 1))
						})
					},
					destroy: function() {
						w.a11y.liveRegion && w.a11y.liveRegion.length > 0 && w.a11y.liveRegion.remove()
					}
				}, w.init = function() {
					w.params.loop && w.createLoop(), w.updateContainerSize(), w.updateSlidesSize(), w.updatePagination(), w.params.scrollbar && w.scrollbar && w.scrollbar.set(), "slide" !== w.params.effect && w.effects[w.params.effect] && (w.params.loop || w.updateProgress(), w.effects[w.params.effect].setTranslate()), w.params.loop ? w.slideTo(w.params.initialSlide + w.loopedSlides, 0, w.params.runCallbacksOnInit) : (w.slideTo(w.params.initialSlide, 0, w.params.runCallbacksOnInit), 0 === w.params.initialSlide && (w.parallax && w.params.parallax && w.parallax.setTranslate(), w.lazy && w.params.lazyLoading && (w.lazy.load(), w.lazy.initialImageLoaded = !0))), w.attachEvents(), w.params.observer && w.support.observer && w.initObservers(), w.params.preloadImages && !w.params.lazyLoading && w.preloadImages(), w.params.autoplay && w.startAutoplay(), w.params.keyboardControl && w.enableKeyboardControl && w.enableKeyboardControl(), w.params.mousewheelControl && w.enableMousewheelControl && w.enableMousewheelControl(), w.params.hashnav && w.hashnav && w.hashnav.init(), w.params.a11y && w.a11y && w.a11y.init(), w.emit("onInit", w)
				}, w.cleanupStyles = function() {
					w.container.removeClass(w.classNames.join(" ")).removeAttr("style"), w.wrapper.removeAttr("style"), w.slides && w.slides.length && w.slides.removeClass([w.params.slideVisibleClass, w.params.slideActiveClass, w.params.slideNextClass, w.params.slidePrevClass].join(" ")).removeAttr("style").removeAttr("data-swiper-column").removeAttr("data-swiper-row"), w.paginationContainer && w.paginationContainer.length && w.paginationContainer.removeClass(w.params.paginationHiddenClass), w.bullets && w.bullets.length && w.bullets.removeClass(w.params.bulletActiveClass), w.params.prevButton && a(w.params.prevButton).removeClass(w.params.buttonDisabledClass), w.params.nextButton && a(w.params.nextButton).removeClass(w.params.buttonDisabledClass), w.params.scrollbar && w.scrollbar && (w.scrollbar.track && w.scrollbar.track.length && w.scrollbar.track.removeAttr("style"), w.scrollbar.drag && w.scrollbar.drag.length && w.scrollbar.drag.removeAttr("style"))
				}, w.destroy = function(e, a) {
					w.detachEvents(), w.stopAutoplay(), w.params.loop && w.destroyLoop(), a && w.cleanupStyles(), w.disconnectObservers(), w.params.keyboardControl && w.disableKeyboardControl && w.disableKeyboardControl(), w.params.mousewheelControl && w.disableMousewheelControl && w.disableMousewheelControl(), w.params.a11y && w.a11y && w.a11y.destroy(), w.emit("onDestroy"), e !== !1 && (w = null)
				}, w.init(), w
			}
		};
		t.prototype = {
			isSafari: function() {
				var e = navigator.userAgent.toLowerCase();
				return e.indexOf("safari") >= 0 && e.indexOf("chrome") < 0 && e.indexOf("android") < 0
			}(),
			isUiWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent),
			isArray: function(e) {
				return "[object Array]" === Object.prototype.toString.apply(e)
			},
			browser: {
				ie: window.navigator.pointerEnabled || window.navigator.msPointerEnabled,
				ieTouch: window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints > 1 || window.navigator.pointerEnabled && window.navigator.maxTouchPoints > 1
			},
			device: function() {
				var e = navigator.userAgent,
					a = e.match(/(Android);?[\s\/]+([\d.]+)?/),
					t = e.match(/(iPad).*OS\s([\d_]+)/),
					r = e.match(/(iPod)(.*OS\s([\d_]+))?/),
					s = !t && e.match(/(iPhone\sOS)\s([\d_]+)/);
				return {
					ios: t || s || r,
					android: a
				}
			}(),
			support: {
				touch: window.Modernizr && Modernizr.touch === !0 || function() {
					return !!("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch)
				}(),
				transforms3d: window.Modernizr && Modernizr.csstransforms3d === !0 || function() {
					var e = document.createElement("div").style;
					return "webkitPerspective" in e || "MozPerspective" in e || "OPerspective" in e || "MsPerspective" in e || "perspective" in e
				}(),
				flexbox: function() {
					for(var e = document.createElement("div").style, a = "alignItems webkitAlignItems webkitBoxAlign msFlexAlign mozBoxAlign webkitFlexDirection msFlexDirection mozBoxDirection mozBoxOrient webkitBoxDirection webkitBoxOrient".split(" "), t = 0; t < a.length; t++)
						if(a[t] in e) return !0
				}(),
				observer: function() {
					return "MutationObserver" in window || "WebkitMutationObserver" in window
				}()
			},
			plugins: {}
		};
		for(var r = (function() {
				var e = function(e) {
						var a = this,
							t = 0;
						for(t = 0; t < e.length; t++) a[t] = e[t];
						return a.length = e.length, this
					},
					a = function(a, t) {
						var r = [],
							s = 0;
						if(a && !t && a instanceof e) return a;
						if(a)
							if("string" == typeof a) {
								var i, n, o = a.trim();
								if(o.indexOf("<") >= 0 && o.indexOf(">") >= 0) {
									var l = "div";
									for(0 === o.indexOf("<li") && (l = "ul"), 0 === o.indexOf("<tr") && (l = "tbody"), (0 === o.indexOf("<td") || 0 === o.indexOf("<th")) && (l = "tr"), 0 === o.indexOf("<tbody") && (l = "table"), 0 === o.indexOf("<option") && (l = "select"), n = document.createElement(l), n.innerHTML = a, s = 0; s < n.childNodes.length; s++) r.push(n.childNodes[s])
								} else
									for(i = t || "#" !== a[0] || a.match(/[ .<>:~]/) ? (t || document).querySelectorAll(a) : [document.getElementById(a.split("#")[1])], s = 0; s < i.length; s++) i[s] && r.push(i[s])
							} else if(a.nodeType || a === window || a === document) r.push(a);
						else if(a.length > 0 && a[0].nodeType)
							for(s = 0; s < a.length; s++) r.push(a[s]);
						return new e(r)
					};
				return e.prototype = {
					addClass: function(e) {
						if("undefined" == typeof e) return this;
						for(var a = e.split(" "), t = 0; t < a.length; t++)
							for(var r = 0; r < this.length; r++) this[r].classList.add(a[t]);
						return this
					},
					removeClass: function(e) {
						for(var a = e.split(" "), t = 0; t < a.length; t++)
							for(var r = 0; r < this.length; r++) this[r].classList.remove(a[t]);
						return this
					},
					hasClass: function(e) {
						return this[0] ? this[0].classList.contains(e) : !1
					},
					toggleClass: function(e) {
						for(var a = e.split(" "), t = 0; t < a.length; t++)
							for(var r = 0; r < this.length; r++) this[r].classList.toggle(a[t]);
						return this
					},
					attr: function(e, a) {
						if(1 === arguments.length && "string" == typeof e) return this[0] ? this[0].getAttribute(e) : void 0;
						for(var t = 0; t < this.length; t++)
							if(2 === arguments.length) this[t].setAttribute(e, a);
							else
								for(var r in e) this[t][r] = e[r], this[t].setAttribute(r, e[r]);
						return this
					},
					removeAttr: function(e) {
						for(var a = 0; a < this.length; a++) this[a].removeAttribute(e);
						return this
					},
					data: function(e, a) {
						if("undefined" == typeof a) {
							if(this[0]) {
								var t = this[0].getAttribute("data-" + e);
								return t ? t : this[0].dom7ElementDataStorage && e in this[0].dom7ElementDataStorage ? this[0].dom7ElementDataStorage[e] : void 0
							}
							return void 0
						}
						for(var r = 0; r < this.length; r++) {
							var s = this[r];
							s.dom7ElementDataStorage || (s.dom7ElementDataStorage = {}), s.dom7ElementDataStorage[e] = a
						}
						return this
					},
					transform: function(e) {
						for(var a = 0; a < this.length; a++) {
							var t = this[a].style;
							t.webkitTransform = t.MsTransform = t.msTransform = t.MozTransform = t.OTransform = t.transform = e
						}
						return this
					},
					transition: function(e) {
						"string" != typeof e && (e += "ms");
						for(var a = 0; a < this.length; a++) {
							var t = this[a].style;
							t.webkitTransitionDuration = t.MsTransitionDuration = t.msTransitionDuration = t.MozTransitionDuration = t.OTransitionDuration = t.transitionDuration = e
						}
						return this
					},
					on: function(e, t, r, s) {
						function i(e) {
							var s = e.target;
							if(a(s).is(t)) r.call(s, e);
							else
								for(var i = a(s).parents(), n = 0; n < i.length; n++) a(i[n]).is(t) && r.call(i[n], e)
						}
						var n, o, l = e.split(" ");
						for(n = 0; n < this.length; n++)
							if("function" == typeof t || t === !1)
								for("function" == typeof t && (r = arguments[1], s = arguments[2] || !1), o = 0; o < l.length; o++) this[n].addEventListener(l[o], r, s);
							else
								for(o = 0; o < l.length; o++) this[n].dom7LiveListeners || (this[n].dom7LiveListeners = []), this[n].dom7LiveListeners.push({
									listener: r,
									liveListener: i
								}), this[n].addEventListener(l[o], i, s);
						return this
					},
					off: function(e, a, t, r) {
						for(var s = e.split(" "), i = 0; i < s.length; i++)
							for(var n = 0; n < this.length; n++)
								if("function" == typeof a || a === !1) "function" == typeof a && (t = arguments[1], r = arguments[2] || !1), this[n].removeEventListener(s[i], t, r);
								else if(this[n].dom7LiveListeners)
							for(var o = 0; o < this[n].dom7LiveListeners.length; o++)
								this[n].dom7LiveListeners[o].listener === t && this[n].removeEventListener(s[i], this[n].dom7LiveListeners[o].liveListener, r);
						return this
					},
					once: function(e, a, t, r) {
						function s(n) {
							t(n), i.off(e, a, s, r)
						}
						var i = this;
						"function" == typeof a && (a = !1, t = arguments[1], r = arguments[2]), i.on(e, a, s, r)
					},
					trigger: function(e, a) {
						for(var t = 0; t < this.length; t++) {
							var r;
							try {
								r = new window.CustomEvent(e, {
									detail: a,
									bubbles: !0,
									cancelable: !0
								})
							} catch(s) {
								r = document.createEvent("Event"), r.initEvent(e, !0, !0), r.detail = a
							}
							this[t].dispatchEvent(r)
						}
						return this
					},
					transitionEnd: function(e) {
						function a(i) {
							if(i.target === this)
								for(e.call(this, i), t = 0; t < r.length; t++) s.off(r[t], a)
						}
						var t, r = ["webkitTransitionEnd", "transitionend", "oTransitionEnd", "MSTransitionEnd", "msTransitionEnd"],
							s = this;
						if(e)
							for(t = 0; t < r.length; t++) s.on(r[t], a);
						return this
					},
					width: function() {
						return this[0] === window ? window.innerWidth : this.length > 0 ? parseFloat(this.css("width")) : null
					},
					outerWidth: function(e) {
						return this.length > 0 ? e ? this[0].offsetWidth + parseFloat(this.css("margin-right")) + parseFloat(this.css("margin-left")) : this[0].offsetWidth : null
					},
					height: function() {
						return this[0] === window ? window.innerHeight : this.length > 0 ? parseFloat(this.css("height")) : null
					},
					outerHeight: function(e) {
						return this.length > 0 ? e ? this[0].offsetHeight + parseFloat(this.css("margin-top")) + parseFloat(this.css("margin-bottom")) : this[0].offsetHeight : null
					},
					offset: function() {
						if(this.length > 0) {
							var e = this[0],
								a = e.getBoundingClientRect(),
								t = document.body,
								r = e.clientTop || t.clientTop || 0,
								s = e.clientLeft || t.clientLeft || 0,
								i = window.pageYOffset || e.scrollTop,
								n = window.pageXOffset || e.scrollLeft;
							return {
								top: a.top + i - r,
								left: a.left + n - s
							}
						}
						return null
					},
					css: function(e, a) {
						var t;
						if(1 === arguments.length) {
							if("string" != typeof e) {
								for(t = 0; t < this.length; t++)
									for(var r in e) this[t].style[r] = e[r];
								return this
							}
							if(this[0]) return window.getComputedStyle(this[0], null).getPropertyValue(e)
						}
						if(2 === arguments.length && "string" == typeof e) {
							for(t = 0; t < this.length; t++) this[t].style[e] = a;
							return this
						}
						return this
					},
					each: function(e) {
						for(var a = 0; a < this.length; a++) e.call(this[a], a, this[a]);
						return this
					},
					html: function(e) {
						if("undefined" == typeof e) return this[0] ? this[0].innerHTML : void 0;
						for(var a = 0; a < this.length; a++) this[a].innerHTML = e;
						return this
					},
					is: function(t) {
						if(!this[0]) return !1;
						var r, s;
						if("string" == typeof t) {
							var i = this[0];
							if(i === document) return t === document;
							if(i === window) return t === window;
							if(i.matches) return i.matches(t);
							if(i.webkitMatchesSelector) return i.webkitMatchesSelector(t);
							if(i.mozMatchesSelector) return i.mozMatchesSelector(t);
							if(i.msMatchesSelector) return i.msMatchesSelector(t);
							for(r = a(t), s = 0; s < r.length; s++)
								if(r[s] === this[0]) return !0;
							return !1
						}
						if(t === document) return this[0] === document;
						if(t === window) return this[0] === window;
						if(t.nodeType || t instanceof e) {
							for(r = t.nodeType ? [t] : t, s = 0; s < r.length; s++)
								if(r[s] === this[0]) return !0;
							return !1
						}
						return !1
					},
					index: function() {
						if(this[0]) {
							for(var e = this[0], a = 0; null !== (e = e.previousSibling);) 1 === e.nodeType && a++;
							return a
						}
						return void 0
					},
					eq: function(a) {
						if("undefined" == typeof a) return this;
						var t, r = this.length;
						return a > r - 1 ? new e([]) : 0 > a ? (t = r + a, new e(0 > t ? [] : [this[t]])) : new e([this[a]])
					},
					append: function(a) {
						var t, r;
						for(t = 0; t < this.length; t++)
							if("string" == typeof a) {
								var s = document.createElement("div");
								for(s.innerHTML = a; s.firstChild;) this[t].appendChild(s.firstChild)
							} else if(a instanceof e)
							for(r = 0; r < a.length; r++) this[t].appendChild(a[r]);
						else this[t].appendChild(a);
						return this
					},
					prepend: function(a) {
						var t, r;
						for(t = 0; t < this.length; t++)
							if("string" == typeof a) {
								var s = document.createElement("div");
								for(s.innerHTML = a, r = s.childNodes.length - 1; r >= 0; r--) this[t].insertBefore(s.childNodes[r], this[t].childNodes[0])
							} else if(a instanceof e)
							for(r = 0; r < a.length; r++) this[t].insertBefore(a[r], this[t].childNodes[0]);
						else this[t].insertBefore(a, this[t].childNodes[0]);
						return this
					},
					insertBefore: function(e) {
						for(var t = a(e), r = 0; r < this.length; r++)
							if(1 === t.length) t[0].parentNode.insertBefore(this[r], t[0]);
							else if(t.length > 1)
							for(var s = 0; s < t.length; s++) t[s].parentNode.insertBefore(this[r].cloneNode(!0), t[s])
					},
					insertAfter: function(e) {
						for(var t = a(e), r = 0; r < this.length; r++)
							if(1 === t.length) t[0].parentNode.insertBefore(this[r], t[0].nextSibling);
							else if(t.length > 1)
							for(var s = 0; s < t.length; s++) t[s].parentNode.insertBefore(this[r].cloneNode(!0), t[s].nextSibling)
					},
					next: function(t) {
						return new e(this.length > 0 ? t ? this[0].nextElementSibling && a(this[0].nextElementSibling).is(t) ? [this[0].nextElementSibling] : [] : this[0].nextElementSibling ? [this[0].nextElementSibling] : [] : [])
					},
					nextAll: function(t) {
						var r = [],
							s = this[0];
						if(!s) return new e([]);
						for(; s.nextElementSibling;) {
							var i = s.nextElementSibling;
							t ? a(i).is(t) && r.push(i) : r.push(i), s = i
						}
						return new e(r)
					},
					prev: function(t) {
						return new e(this.length > 0 ? t ? this[0].previousElementSibling && a(this[0].previousElementSibling).is(t) ? [this[0].previousElementSibling] : [] : this[0].previousElementSibling ? [this[0].previousElementSibling] : [] : [])
					},
					prevAll: function(t) {
						var r = [],
							s = this[0];
						if(!s) return new e([]);
						for(; s.previousElementSibling;) {
							var i = s.previousElementSibling;
							t ? a(i).is(t) && r.push(i) : r.push(i), s = i
						}
						return new e(r)
					},
					parent: function(e) {
						for(var t = [], r = 0; r < this.length; r++) e ? a(this[r].parentNode).is(e) && t.push(this[r].parentNode) : t.push(this[r].parentNode);
						return a(a.unique(t))
					},
					parents: function(e) {
						for(var t = [], r = 0; r < this.length; r++)
							for(var s = this[r].parentNode; s;) e ? a(s).is(e) && t.push(s) : t.push(s), s = s.parentNode;
						return a(a.unique(t))
					},
					find: function(a) {
						for(var t = [], r = 0; r < this.length; r++)
							for(var s = this[r].querySelectorAll(a), i = 0; i < s.length; i++)
								t.push(s[i]);
						return new e(t)
					},
					children: function(t) {
						for(var r = [], s = 0; s < this.length; s++)
							for(var i = this[s].childNodes, n = 0; n < i.length; n++)
								t ? 1 === i[n].nodeType && a(i[n]).is(t) && r.push(i[n]) : 1 === i[n].nodeType && r.push(i[n]);
						return new e(a.unique(r))
					},
					remove: function() {
						for(var e = 0; e < this.length; e++) this[e].parentNode && this[e].parentNode.removeChild(this[e]);
						return this
					},
					add: function() {
						var e, t, r = this;
						for(e = 0; e < arguments.length; e++) {
							var s = a(arguments[e]);
							for(t = 0; t < s.length; t++) r[r.length] = s[t], r.length++
						}
						return r
					}
				}, a.fn = e.prototype, a.unique = function(e) {
					for(var a = [], t = 0; t < e.length; t++) - 1 === a.indexOf(e[t]) && a.push(e[t]);
					return a
				}, a
			}()), s = ["jQuery", "Zepto", "Dom7"], i = 0; i < s.length; i++) window[s[i]] && e(window[s[i]]);
		var n;
		n = "undefined" == typeof r ? window.Dom7 || window.Zepto || window.jQuery : r, n && ("transitionEnd" in n.fn || (n.fn.transitionEnd = function(e) {
			function a(i) {
				if(i.target === this)
					for(e.call(this, i), t = 0; t < r.length; t++) s.off(r[t], a)
			}
			var t, r = ["webkitTransitionEnd", "transitionend", "oTransitionEnd", "MSTransitionEnd", "msTransitionEnd"],
				s = this;
			if(e)
				for(t = 0; t < r.length; t++) s.on(r[t], a);
			return this
		}), "transform" in n.fn || (n.fn.transform = function(e) {
			for(var a = 0; a < this.length; a++) {
				var t = this[a].style;
				t.webkitTransform = t.MsTransform = t.msTransform = t.MozTransform = t.OTransform = t.transform = e
			}
			return this
		}), "transition" in n.fn || (n.fn.transition = function(e) {
			"string" != typeof e && (e += "ms");
			for(var a = 0; a < this.length; a++) {
				var t = this[a].style;
				t.webkitTransitionDuration = t.MsTransitionDuration = t.msTransitionDuration = t.MozTransitionDuration = t.OTransitionDuration = t.transitionDuration = e
			}
			return this
		})), window.Swiper = t
	}(), "undefined" != typeof module ? module.exports = window.Swiper : "function" == typeof define && define.amd && define([], function() {
		"use strict";
		return window.Swiper
	});
});
define('swiper.previewImage', function(require, exports, module) {
	var Zepto = $ = require("zepto");
	require('swiper');;
	(function($) {
		var PreviewImage = function(options) {
			this.options = $.extend({}, PreviewImage.defaults, options);
			this.style = '<style type="text/css" id="previewContainerStyle">{{#isFixed#}}.preview_container .swiper-container{height:100%;}/*.preview_container .swiper-slide{ text-align: center; display: table-cell; vertical-align:middle;}*/.preview_container .swiper-pagination-bullet-active{background:#fff;}.preview_container img{max-width: 100%; max-height: 100%; vertical-align: middle;}.preview_container .des{position: absolute;bottom: 0;width: 100%;height: 15%;line-height: 24px;color: #fff;text-align: left;background-color: rgba(255,255,255,.1);}.des_inner{padding:10px;}</style>';
			this.previewContainerTemplate = '<div id="previewContainer" class="preview_container" style="background:#181818;height:100%;"></div>';
			this.swiperTemplate = '<div class="swiper-container"><div class="swiper-wrapper">{{#swiperlistTemplate#}}</div><div class="swiper-pagination"></div></div>';
			this.swiperItemTemplate = '<div class="swiper-slide" style="line-height:' + document.documentElement.clientHeight + 'px;{{#thumbnail#}}"><a href="{{#link#}}"><img class="swiper-lazy" data-src="{{#img#}}" /></a><div class="swiper-lazy-preloader"></div>{{#des#}}</div>';
			this.isShow = false;
			this._init();
		}
		PreviewImage._list = [];
		PreviewImage.prototype = {
			constructor: PreviewImage,
			_hideMainContainer: function() {
				$(this.options.mainWrap).addClass(this.options.toggleCls);;
			},
			_showMainContainer: function() {
				$(this.options.mainWrap).removeClass(this.options.toggleCls);;
			},
			_isRepeat: function() {
				var item = this.options.current;
				var arr = this.options.urls;
				var flag = false;
				if(typeof(arr[0]) === 'string' && typeof(this.options.current[0]) === 'string') {
					for(var i = 0; i < arr.length; i++) {
						if(item == arr[i]) {
							flag = true;
						}
					}
				} else {
					for(var i = 0; i < arr.length; i++) {
						if(item.img == arr[i].img) {
							flag = true;
						}
					}
				}
				if(flag) {
					return true;
				} else {
					return false;
				}
			},
			_isLoaded: function() {
				var len = PreviewImage._list.length;
				var arr = this.options.urls;
				var flag = 0;
				if(len > 0) {
					for(var i = 0; i < len; i++) {
						if(PreviewImage._list[i].toString() == arr.toString()) {
							flag = 1;
							break;
						}
					}
					if(flag == 1) {
						return true;
					} else {
						return false;
					}
				} else {
					return false;
				}
			},
			_buildSlider: function() {
				if(typeof(this.options.urls[0]) === 'string') {
					if(!this.options.current) {
						var html = ''
					} else {
						if(this._isRepeat()) {
							var html = '';
						} else {
							var html = this.swiperItemTemplate.replace(/{{#img#}}/, this.options.current).replace(/{{#link#}}/, 'javascript:;').replace(/{{#des#}}/, '');
						}
					}
					var urls = this.options.urls;
					var isThumbnail = false;
					if(this.options.thumbnail.length > 0) {
						isThumbnail = true;
					}
					for(var i = 0; i < urls.length; i++) {
						var item = this.options.urls[i];
						if(isThumbnail) {
							var thumbnail = 'background:url(' + this.options.thumbnail[i] + ') 50% 50% no-repeat;';;;
						} else {
							var thumbnail = '';
						}
						html += this.swiperItemTemplate.replace(/{{#img#}}/, item).replace(/{{#link#}}/, 'javascript:;').replace(/{{#des#}}/, '').replace(/{{#thumbnail#}}/gi, thumbnail);;
						if(this.options.current) {
							if(this.options.current == item) {
								this.index = i;
							}
						}
					}
					html = this.swiperTemplate.replace(/{{#swiperlistTemplate#}}/, html);
				} else if(typeof(this.options.urls[0]) === 'object') {
					if(!this.options.current) {
						var html = '';
					} else {
						if(this._isRepeat()) {
							var html = '';
						} else {
							var cur_img = this.options.current[0].img
							if(this.options.current[0].link !== undefined) {
								var cur_link = this.options.current[0].link;
							} else {
								var cur_link = '';
							}
							if(this.options.current[0].des !== undefined) {
								var cur_des = '<div class="des"><div class="des_inner">' + this.options.current[0].des + '</div></div>';
							} else {
								var cur_des = '';
							}
							if(this.options.current[0].thumbnail !== undefined) {
								var cur_thumbnail = 'background:url(' + this.options.current[0].thumbnail + ') 50% 50% no-repeat;';
							} else {
								var cur_thumbnail = '';
							}
							var html = this.swiperItemTemplate.replace(/{{#img#}}/, cur_img).replace(/{{#link#}}/, cur_link).replace(/{{#des#}}/gi, cur_des).replace(/{{#thumbnail#}}/gi, cur_thumbnail);
						}
					}
					var urls = this.options.urls;
					for(var i = 0; i < urls.length; i++) {
						var item = this.options.urls[i];
						if(item.link !== undefined) {
							var link = item.link;
						} else {
							var link = '';
						}
						if(item.des !== undefined) {
							var des = '<div class="des"><div class="des_inner">' + item.des + '</div></div>';
						} else {
							var des = '';
						}
						if(item.thumbnail !== undefined) {
							var thumbnail = 'background:url(' + item.thumbnail + ') 50% 50% no-repeat;';;
						} else {
							var thumbnail = '';
						}
						html += this.swiperItemTemplate.replace(/{{#img#}}/, item.img).replace(/{{#link#}}/, link).replace(/{{#des#}}/gi, des).replace(/{{#thumbnail#}}/gi, thumbnail);
						if(this.options.current) {
							if(item.img == this.options.current[0].img) {
								this.index = i;
							}
						}
					}
					html = this.swiperTemplate.replace(/{{#swiperlistTemplate#}}/, html);
				}
				return html;
			},
			_buildContainer: function() {
				var silderHtml = this._buildSlider();
				$previewContainer = $(this.previewContainerTemplate).append(silderHtml);
				$('body').append($previewContainer);
				this._initSwiper();
			},
			_showContainer: function() {
				$('#previewContainer').removeClass(this.options.toggleCls);
				var silderHtml = this._buildSlider();
				$('#previewContainer').html(silderHtml);
				this._initSwiper();
			},
			_hideContainer: function() {
				$('#previewContainer').addClass(this.options.toggleCls);
			},
			_destroyContainer: function() {
				$('#previewContainer').remove();
			},
			_initSwiper: function() {
				var _self = this;
				this.mySwiper = new Swiper('.swiper-container', {
					lazyLoading: true,
					lazyLoadingOnTransitionStart: true,
					loop: true,
					pagination: '.swiper-pagination',
					initialSlide: this.index || 0,
					onClick: function(swiper) {
						_self.hide();
					}
				})
			},
			show: function() {
				var _self = this;
				var style = this._isFixedStyle();
				if(!_self.options.isFixed) {
					_self._hideMainContainer();
				}
				if($('#previewContainer').length == 0) {
					$('head').append(style);
					_self._buildContainer();
				} else {
					_self._showContainer();
				}
				this.isShow = true;
			},
			hide: function() {
				var _self = this;
				if(!_self.options.isFixed) {
					_self._showMainContainer();
				}
				this.isShow = false;
				if(this.options.destroyAfterClose) {
					this._destroyContainer();
					delete this.mySwiper;
				} else {
					this._hideContainer();
				}
			},
			_hash: function() {
				var _self = this;
				$(window).on('hashchange', function() {
					if(window.location.hash === "#previewImage" && _self.isShow) {} else if(window.location.hash === "" && _self.isShow) {}
				});
			},
			_isFixedStyle: function() {
				var _self = this;
				if(_self.options.isFixed) {
					var style = _self.style.replace(/{{#isFixed#}}/, '.preview_container{position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;}')
				} else {
					var style = _self.style.replace(/{{#isFixed#}}/, '');
				}
				return style;
			},
			_init: function() {
				this.show();
			}
		}
		PreviewImage.defaults = {
			isFixed: true,
			mainWrap: '#mainWrap',
			toggleCls: 'hide',
			destroyAfterClose: false,
			current: null,
			urls: [],
			thumbnail: []
		};
		window.PreviewImage = PreviewImage;
		$.previewImage = function(options) {
			return new PreviewImage(options);
		}
	})(Zepto);
})
define('xss', function(require, exports, module) {
	function $xss(str, type) {
		if(!str) {
			return str === 0 ? "0" : "";
		}
		switch(type) {
			case "none":
				return str + "";
				break;
			case "html":
				return str.replace(/[&'"<>\/\\\-\x00-\x09\x0b-\x0c\x1f\x80-\xff]/g, function(r) {
					return "&#" + r.charCodeAt(0) + ";"
				}).replace(/ /g, "&nbsp;").replace(/\r\n/g, "<br />").replace(/\n/g, "<br />").replace(/\r/g, "<br />");
				break;
			case "htmlEp":
				return str.replace(/[&'"<>\/\\\-\x00-\x1f\x80-\xff]/g, function(r) {
					return "&#" + r.charCodeAt(0) + ";"
				});
				break;
			case "url":
				return escape(str).replace(/\+/g, "%2B");
				break;
			case "miniUrl":
				return str.replace(/%/g, "%25");
				break;
			case "script":
				return str.replace(/[\\"']/g, function(r) {
					return "\\" + r;
				}).replace(/%/g, "\\x25").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\x01/g, "\\x01");
				break;
			case "reg":
				return str.replace(/[\\\^\$\*\+\?\{\}\.\(\)\[\]]/g, function(a) {
					return "\\" + a;
				});
				break;
			default:
				return escape(str).replace(/[&'"<>\/\\\-\x00-\x09\x0b-\x0c\x1f\x80-\xff]/g, function(r) {
					return "&#" + r.charCodeAt(0) + ";"
				}).replace(/ /g, "&nbsp;").replace(/\r\n/g, "<br />").replace(/\n/g, "<br />").replace(/\r/g, "<br />");
				break;
		}
	}
	exports.parse = $xss;
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