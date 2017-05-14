define('mmd.head.v2', function(require, exports, module) {
	var $ = require('zepto'),
		cookie = require('cookie'),
		dSmartbox = $('#smartbox'),
		dCancelBtn = $('.hd_cancel'),
		dMDShare = $('#MDShare'),
		kwId = $("#kw"),
		iSmartTag;

	function iphoneToTop() {
		$("#headWrap").css("position", "absolute").css("top", $(window).scrollTop());
	}

	function initHeadEvent() {
		if(window.navigator.appVersion.match(/iphone/gi) && (window.gPAGECONFIG.headstyle == 'search33')) {
			$("#keyword").focus(function() {
				$("#headWrap").css("position", "fixed").hide();
				setTimeout(function() {
					$('#headWrap').show()
				}, 50);
			});
		}
		$('#searchForm').on('submit', function(e) {
			e.preventDefault();
			var objKw = $("#kw");
			if(!$.trim(objKw.val())) {
				var defaultSearchLink = $.trim(objKw.data("default_search_link"));
				if(defaultSearchLink) {
					location.href = defaultSearchLink;
					return false;
				}
			}
			$(this).get(0).submit();
		});
		$('#headContent').unbind().click(function(e) {
			var src = e.target;
			switch(src.getAttribute('attr-tag')) {
				case 'shareBtn':
					openShare();
					break;
				case 'cancelBtn':
					kwId.val('');
					break;
				case 'searchBtn':
					$('#searchForm').submit();
					break;
			}
		});
		dCancelBtn.click(function() {
			kwId.val('');
			hideSmartbox();
			dCancelBtn.hide();
		});
	}

	function openShare() {
		dMDShare.show();
		modulejs('webshare', function(mWebshare) {
			dMDShare.on('click', function(e) {
				var src = e.target;
				switch(src.className) {
					case 'icon_tx_wb':
						mWebshare.share('txwb');
						break;
					case 'icon_wb':
						mWebshare.share('wb');
						break;
					case 'btn_cancel':
						dMDShare.hide();
						break;
				}
			});
		});
	}

	function throttle(func) {
		var me = this;
		me.uid = 0;
		me.lastUid;
		me.lastArgs;
		me.timeTag = Math.random();
		return function() {
			var args = arguments;
			me.uid++;
			me.lastArgs = args;
			clearTimeout(me.timeTag);
			me.timeTag = setTimeout(function() {
				if(me.lastUid !== me.uid) {
					func(me.lastArgs);
					me.lastUid = me.uid;
				}
			}, 400);
		}
	}

	function calcSmartBoxHeight() {
		var iWH = screen.height,
			iHH = $('div.md_hd_wrap').offset().height;
		dSmartbox.css({
			height: iWH - iHH,
			overflow: 'auto'
		});
		$(document.body).css('overflow', 'hidden');
	}

	function hideSmartbox() {
		dSmartbox.hide();
		$(document.body).css('overflow', 'auto');
		clearInterval(iSmartTag);
	}

	function getUserMessage() {
		var contentObj = $("#Js_username"),
			$headContent = $("#headContent");
		if(contentObj[0] && (cookie.get("uin") || cookie.get("uid"))) {
			$.ajax({
				type: "post",
				dataType: "json",
				url: "//w.midea.com/my/index/getuserinfo",
				error: function(request) {},
				success: function(result) {
					if("0" == result.errCode) {
						$headContent.addClass('header_user_has_login');
						if(result.userInfo.strImageUrl) {
							$('#Js_username .user_portrait').attr("src", result.userInfo.strImageUrl);
						} else {
							$headContent.addClass('header_user_has_not_portrait');
						}
						if(result.userInfo.nUserType & 2) {
							var day = new Date().getDate(),
								$colLeft = $headContent.find(".col_left");
							var $dotHtml = "<i class='icon_new_function' style='position: absolute;display: inline-block;background: red;width: 8px;height: 8px; top: 7px;left: 37px; border-radius: 4px;'></i>";
							if(day >= 17 && day <= 25) {
								$colLeft.append($dotHtml);
							}
						}
					}
				}
			});
		} else {
			contentObj.html("<i class='icon_index hd_my'></i><span class='nickname'>登录</span>");
		}
	}

	function initFooterEvent() {
		var $footWrap = $(".foot_wrap");
		var $footNav = $("#footNav");
		var $mainWrap = $(".main_wrap");
		if($footNav[0]) {
			if(checkThisUrl("w.midea.com")) {
				$footWrap.removeClass("hide");
				$footNav.removeClass("hide");
				$footNav.find(".foot_nav_item_index").addClass("cur_foot_nav_item");
				$footWrap.addClass("fix_footer_nav");
			} else if(checkThisUrl("w.midea.com/category")) {
				$footNav.removeClass("hide");
				$footNav.find(".foot_nav_item_category").addClass("cur_foot_nav_item");
			} else if(checkThisUrl("w.midea.com/community") || checkThisUrl("w.midea.com/community/index")) {
				$footNav.removeClass("hide");
				$footNav.find(".foot_nav_item_community").addClass("cur_foot_nav_item");
				$(".post_bar").addClass("fix_footer_nav");
			} else if(checkThisUrl("w.midea.com/my/index")) {
				$footNav.removeClass("hide");
				$footNav.find(".foot_nav_item_user").addClass("cur_foot_nav_item");
				$mainWrap.addClass("fix_footer_nav");
			} else if(checkThisUrl("w.midea.com/cart")) {
				$footNav.removeClass("hide");
				$footNav.find(".foot_nav_item_user").addClass("cur_foot_nav_item");
				$mainWrap.addClass("fix_footer_nav");
			} else {
				var showFooterWrap = [];
			}
		}
	}

	function checkThisUrl(url) {
		var locationUrl = location.href;
		var findFlag = false;
		var httpUrl = "http://" + url;
		var httpsUrl = "https://" + url;
		if(locationUrl == httpUrl || locationUrl == (httpUrl + "/") || locationUrl.indexOf(httpUrl + "?") > -1 || locationUrl.indexOf(httpUrl + "/?") > -1 || locationUrl.indexOf(httpUrl + "#") > -1) {
			findFlag = true;
		}
		if(locationUrl == httpsUrl || locationUrl == (httpsUrl + "/") || locationUrl.indexOf(httpsUrl + "?") > -1 || locationUrl.indexOf(httpsUrl + "/?") > -1 || locationUrl.indexOf(httpsUrl + "#") > -1) {
			findFlag = true;
		}
		return findFlag;
	}

	function getCartNum() {
		var $cartNum = $("#cartNum");
		$.ajax({
			type: "GET",
			dataType: "json",
			url: "//w.midea.com/my/index/ajax_index_cart_num",
			success: function(data) {
				if(data.errcode == 0) {
					var cartSum = data.data.nCount;
					if(typeof(cartSum) != "undefined" && cartSum > 0) {
						$cartNum.css('display', 'inline-block');
						$cartNum.html(cartSum);
					}
				}
			},
			error: function(data) {}
		});
	}
	exports.init = function() {
		initFooterEvent();
		initHeadEvent();
		getUserMessage();
		$("body").on("click", "a", function() {
			var text = $(this).data("ga_text") || $(this).text() || $(this).attr('title') || $(this).find('img').attr('alt');
			if(text && text.match(/^[\s\n]*$/) != undefined) return;
			window.ga && ga('send', 'event', "按钮链接（a）", text, $(this).parents("[data-ga]").data("ga"));
		});
		getCartNum();
	}
});
define('webshare', function(require, exports, module) {
	var oConf = window._md_share_config;
	exports.share = function(sShareType) {
		switch(sShareType) {
			case 'txwb':
				setTXWeiboContent();
				break;
			case 'wb':
				setWeiboContent();
				break;
		}
	}

	function setWeiboContent() {
		var url = 'http://service.weibo.com/share/share.php?url=' + encodeURIComponent(oConf.url) + '&title=' + encodeURIComponent(oConf.text + '\n' + oConf.desc) + '&pic=' + oConf.image;
		location.href = url;
	}

	function setTXWeiboContent() {
		var url = 'http://share.v.t.qq.com/index.php?c=share&a=index&url=' + encodeURIComponent(oConf.url) + '&title=' + encodeURIComponent(oConf.text + '\n' + oConf.desc) + '&pic=' + encodeURIComponent(oConf.image);
		location.href = url;
	}
});