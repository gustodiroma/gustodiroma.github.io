/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
        clientHintSupport: {
                gravatar: false,
                files: false,
                photon: false,
                mshots: false,
                staticAssets: false,
                latex: false,
                imgpress: false,
        },
	useHints: false,
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

        hintsFor: function( service ) {
                if ( this.useHints === false ) {
                        return false;
                }
                if ( this.hints() === false ) {
                        return false;
                }
                if ( typeof this.clientHintSupport[service] === "undefined" ) {
                        return false;
                }
                if ( this.clientHintSupport[service] === true ) {
                        return true;
                }
                return false;
        },

	hints: function() {
		try {
			var chrome = window.navigator.userAgent.match(/\sChrome\/([0-9]+)\.[.0-9]+\s/)
			if (chrome !== null) {
				var version = parseInt(chrome[1], 10)
				if (isNaN(version) === false && version >= 46) {
					return true
				}
			}
		} catch (e) {
			return false
		}
		return false
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that have srcset attributes.
			if ( imgs[i].hasAttribute('srcset') ) {
				continue;
			}

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

                var isFiles = false;
                var isLatex = false;
                var isPhoton = false;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Skip CoBlocks Lightbox images
		if ( img.parentNode.className.match(/coblocks-lightbox__image/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
                        if ( this.hintsFor( "gravatar" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
                        if ( this.hintsFor( "mshots" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});

			// Update height attribute to match width
			newSrc = newSrc.replace( /([?&]h=)(\d+)/, function($0, $1, $2) {
				if ( newSrc == img.src ) {
					return $0;
				}
				// Stash the original size
				var originalAtt = 'originalh', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
				}
				// Get the height of the image in CSS pixels
				var size = img.clientHeight;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalHeight )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
                        if ( this.hintsFor( "imgpress" ) === true ) {
                                return false; 
                        }
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale files.wordpress.com, LaTeX, or Photon images (i#.wp.com)
		else if (
			( isFiles = img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/) ) ||
			( isLatex = img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ) ||
			( isPhoton = img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/) )
		) {
                        if ( false !== isFiles && this.hintsFor( "files" ) === true ) {
                                return false
                        }
                        if ( false !== isLatex && this.hintsFor( "latex" ) === true ) {
                                return false
                        }
                        if ( false !== isPhoton && this.hintsFor( "photon" ) === true ) {
                                return false
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /([?&]w=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.width );
				}

				url_var = newSrc.match( /([?&]h=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
                        if ( this.hintsFor( "staticAssets" ) === true ) {
                                return false; 
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
( function( $ ) {
	var cookieValue = document.cookie.replace( /(?:(?:^|.*;\s*)eucookielaw\s*\=\s*([^;]*).*$)|^.*$/, '$1' ),
		overlay = $( '#eu-cookie-law' ),
		container = $( '.widget_eu_cookie_law_widget' ),
		initialScrollPosition,
		scrollFunction;

	if ( overlay.hasClass( 'ads-active' ) ) {
		var adsCookieValue = document.cookie.replace( /(?:(?:^|.*;\s*)personalized-ads-consent\s*\=\s*([^;]*).*$)|^.*$/, '$1' );
		if ( '' !== cookieValue && '' !== adsCookieValue ) {
			overlay.remove();
		}
	} else if ( '' !== cookieValue ) {
		overlay.remove();
	}

	$( '.widget_eu_cookie_law_widget' ).appendTo( 'body' ).fadeIn();

	overlay.find( 'form' ).on( 'submit', accept );

	if ( overlay.hasClass( 'hide-on-scroll' ) ) {
		initialScrollPosition = $( window ).scrollTop();
		scrollFunction = function() {
			if ( Math.abs( $( window ).scrollTop() - initialScrollPosition ) > 50 ) {
				accept();
			}
		};
		$( window ).on( 'scroll', scrollFunction );
	} else if ( overlay.hasClass( 'hide-on-time' ) ) {
		setTimeout( accept, overlay.data( 'hide-timeout' ) * 1000 );
	}

	var accepted = false;
	function accept( event ) {
		if ( accepted ) {
			return;
		}
		accepted = true;

		if ( event && event.preventDefault ) {
			event.preventDefault();
		}

		if ( overlay.hasClass( 'hide-on-scroll' ) ) {
			$( window ).off( 'scroll', scrollFunction );
		}

		var expireTime = new Date();
		expireTime.setTime( expireTime.getTime() + ( overlay.data( 'consent-expiration' ) * 24 * 60 * 60 * 1000 ) );

		document.cookie = 'eucookielaw=' + expireTime.getTime() + ';path=/;expires=' + expireTime.toGMTString();
		if ( overlay.hasClass( 'ads-active' ) && overlay.hasClass( 'hide-on-button' ) ) {
			document.cookie = 'personalized-ads-consent=' + expireTime.getTime() + ';path=/;expires=' + expireTime.toGMTString();
		}

		overlay.fadeOut( 400, function() {
			overlay.remove();
			container.remove();
		} );
	}
} )( jQuery );
;
/***
 * Warning: This file is remotely enqueued in Jetpack's Masterbar module.
 * Changing it will also affect Jetpack sites.
 */
jQuery( document ).ready( function( $, wpcom ) {
	var masterbar,
		menupops = $( 'li#wp-admin-bar-blog.menupop, li#wp-admin-bar-newdash.menupop, li#wp-admin-bar-my-account.menupop' ),
		newmenu = $( '#wp-admin-bar-new-post-types' );

	// Unbind hoverIntent, we want clickable menus.
	menupops
		.unbind( 'mouseenter mouseleave' )
		.removeProp( 'hoverIntent_t' )
		.removeProp( 'hoverIntent_s' )
		.on( 'mouseover', function(e) {
			var li = $(e.target).closest( 'li.menupop' );
			menupops.not(li).removeClass( 'ab-hover' );
			li.toggleClass( 'ab-hover' );
		} )
		.on( 'click touchstart', function(e) {
			var $target = $( e.target );

			if ( masterbar.focusSubMenus( $target ) ) {
				return;
			}

			e.preventDefault();
			masterbar.toggleMenu( $target );
		} );

	masterbar = {
		focusSubMenus: function( $target ) {
			// Handle selection of menu items
			if ( ! $target.closest( 'ul' ).hasClass( 'ab-top-menu' ) ) {
				$target
					.closest( 'li' );

				return true;
			}

			return false;
		},

		toggleMenu: function( $target ) {
			var $li = $target.closest( 'li.menupop' ),
				$html = $( 'html' );

			$( 'body' ).off( 'click.ab-menu' );
			$( '#wpadminbar li.menupop' ).not($li).removeClass( 'ab-active wpnt-stayopen wpnt-show' );

			if ( $li.hasClass( 'ab-active' ) ) {
				$li.removeClass( 'ab-active' );
				$html.removeClass( 'ab-menu-open' );
			} else {
				$li.addClass( 'ab-active' );
				$html.addClass( 'ab-menu-open' );

				$( 'body' ).on( 'click.ab-menu', function( e ) {
					if ( ! $( e.target ).parents( '#wpadminbar' ).length ) {
						e.preventDefault();
						masterbar.toggleMenu( $li );
						$( 'body' ).off( 'click.ab-menu' );
					}
				} );
			}
		}
	};
} );;
/*globals JSON */
( function( $ ) {
	var eventName = 'wpcom_masterbar_click';

	var linksTracksEvents = {
		//top level items
		'wp-admin-bar-blog'                        : 'my_sites',
		'wp-admin-bar-newdash'                     : 'reader',
		'wp-admin-bar-ab-new-post'                 : 'write_button',
		'wp-admin-bar-my-account'                  : 'my_account',
		'wp-admin-bar-notes'                       : 'notifications',
		//my sites - top items
		'wp-admin-bar-switch-site'                 : 'my_sites_switch_site',
		'wp-admin-bar-blog-info'                   : 'my_sites_site_info',
		'wp-admin-bar-site-view'                   : 'my_sites_view_site',
		'wp-admin-bar-blog-stats'                  : 'my_sites_site_stats',
		'wp-admin-bar-plan'                        : 'my_sites_plan',
		'wp-admin-bar-plan-badge'                  : 'my_sites_plan_badge',
		//my sites - manage
		'wp-admin-bar-edit-page'                   : 'my_sites_manage_site_pages',
		'wp-admin-bar-new-page-badge'              : 'my_sites_manage_add_page',
		'wp-admin-bar-edit-post'                   : 'my_sites_manage_blog_posts',
		'wp-admin-bar-new-post-badge'              : 'my_sites_manage_add_post',
		'wp-admin-bar-edit-attachment'             : 'my_sites_manage_media',
		'wp-admin-bar-new-attachment-badge'        : 'my_sites_manage_add_media',
		'wp-admin-bar-comments'                    : 'my_sites_manage_comments',
		'wp-admin-bar-edit-jetpack-testimonial'    : 'my_sites_manage_testimonials',
		'wp-admin-bar-new-jetpack-testimonial'     : 'my_sites_manage_add_testimonial',
		'wp-admin-bar-edit-jetpack-portfolio'      : 'my_sites_manage_portfolio',
		'wp-admin-bar-new-jetpack-portfolio'       : 'my_sites_manage_add_portfolio',
		//my sites - personalize
		'wp-admin-bar-themes'                      : 'my_sites_personalize_themes',
		'wp-admin-bar-cmz'                         : 'my_sites_personalize_themes_customize',
		//my sites - configure
		'wp-admin-bar-sharing'                     : 'my_sites_configure_sharing',
		'wp-admin-bar-people'                      : 'my_sites_configure_people',
		'wp-admin-bar-people-add'                  : 'my_sites_configure_people_add_button',
		'wp-admin-bar-plugins'                     : 'my_sites_configure_plugins',
		'wp-admin-bar-domains'                     : 'my_sites_configure_domains',
		'wp-admin-bar-domains-add'                 : 'my_sites_configure_add_domain',
		'wp-admin-bar-blog-settings'               : 'my_sites_configure_settings',
		'wp-admin-bar-legacy-dashboard'            : 'my_sites_configure_wp_admin',
		//reader
		'wp-admin-bar-followed-sites'              : 'reader_followed_sites',
		'wp-admin-bar-reader-followed-sites-manage': 'reader_manage_followed_sites',
		'wp-admin-bar-discover-discover'           : 'reader_discover',
		'wp-admin-bar-discover-search'             : 'reader_search',
		'wp-admin-bar-my-activity-my-likes'        : 'reader_my_likes',
		//account
		'wp-admin-bar-user-info'                   : 'my_account_user_name',
		// account - profile
		'wp-admin-bar-my-profile'                  : 'my_account_profile_my_profile',
		'wp-admin-bar-account-settings'            : 'my_account_profile_account_settings',
		'wp-admin-bar-billing'                     : 'my_account_profile_manage_purchases',
		'wp-admin-bar-security'                    : 'my_account_profile_security',
		'wp-admin-bar-notifications'               : 'my_account_profile_notifications',
		//account - special
		'wp-admin-bar-get-apps'                    : 'my_account_special_get_apps',
		'wp-admin-bar-next-steps'                  : 'my_account_special_next_steps',
		'wp-admin-bar-help'                        : 'my_account_special_help',
	};

	var notesTracksEvents = {
		openSite: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_site',
				site_id: data.siteId
			};
		},
		openPost: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_post',
				site_id: data.siteId,
				post_id: data.postId
			};
		},
		openComment: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_comment',
				site_id: data.siteId,
				post_id: data.postId,
				comment_id: data.commentId
			};
		}
	};

	function recordTracksEvent( eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	}

	function parseJson( s, defaultValue ) {
		try {
			return JSON.parse( s );
		} catch ( e ) {
			return defaultValue;
		}
	}

	$( document ).ready( function() {
		var trackableLinks = '.mb-trackable .ab-item:not(div),' +
			'#wp-admin-bar-notes .ab-item,' +
			'#wp-admin-bar-user-info .ab-item,' +
			'.mb-trackable .ab-secondary';

		$( trackableLinks ).on( 'click touchstart', function( e ) {
			var $target = $( e.target ),
				$parent = $target.closest( 'li' );

			if ( ! $parent ) {
				return;
			}

			var trackingId = $target.attr( 'ID' ) || $parent.attr( 'ID' );

			if ( ! linksTracksEvents.hasOwnProperty( trackingId ) ) {
				return;
			}

			var eventProps = { 'clicked': linksTracksEvents[ trackingId ] };

			recordTracksEvent( eventProps );
		} );
	} );

	// listen for postMessage events from the notifications iframe
	$( window ).on( 'message', function( e ) {
		var event = ! e.data && e.originalEvent.data ? e.originalEvent : e;
		if ( event.origin !== 'https://widgets.wp.com' ) {
			return;
		}

		var data = ( 'string' === typeof event.data ) ? parseJson( event.data, {} ) : event.data;
		if ( 'notesIframeMessage' !== data.type ) {
			return;
		}

		var eventData = notesTracksEvents[ data.action ];
		if ( ! eventData ) {
			return;
		}

		recordTracksEvent( eventData( data ) );
	} );

} )( jQuery );
;
/*!
 * jQuery UI Core 1.11.4
 * http://jqueryui.com
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/category/ui-core/
 */
!function(e){"function"==typeof define&&define.amd?define(["jquery"],e):e(jQuery)}(function(a){var e,t,n,i;function r(e,t){var n,i,r,o=e.nodeName.toLowerCase();return"area"===o?(i=(n=e.parentNode).name,!(!e.href||!i||"map"!==n.nodeName.toLowerCase())&&(!!(r=a("img[usemap='#"+i+"']")[0])&&s(r))):(/^(input|select|textarea|button|object)$/.test(o)?!e.disabled:"a"===o&&e.href||t)&&s(e)}function s(e){return a.expr.filters.visible(e)&&!a(e).parents().addBack().filter(function(){return"hidden"===a.css(this,"visibility")}).length}a.ui=a.ui||{},a.extend(a.ui,{version:"1.11.4",keyCode:{BACKSPACE:8,COMMA:188,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SPACE:32,TAB:9,UP:38}}),a.fn.extend({scrollParent:function(e){var t=this.css("position"),n="absolute"===t,i=e?/(auto|scroll|hidden)/:/(auto|scroll)/,r=this.parents().filter(function(){var e=a(this);return(!n||"static"!==e.css("position"))&&i.test(e.css("overflow")+e.css("overflow-y")+e.css("overflow-x"))}).eq(0);return"fixed"!==t&&r.length?r:a(this[0].ownerDocument||document)},uniqueId:(e=0,function(){return this.each(function(){this.id||(this.id="ui-id-"+ ++e)})}),removeUniqueId:function(){return this.each(function(){/^ui-id-\d+$/.test(this.id)&&a(this).removeAttr("id")})}}),a.extend(a.expr[":"],{data:a.expr.createPseudo?a.expr.createPseudo(function(t){return function(e){return!!a.data(e,t)}}):function(e,t,n){return!!a.data(e,n[3])},focusable:function(e){return r(e,!isNaN(a.attr(e,"tabindex")))},tabbable:function(e){var t=a.attr(e,"tabindex"),n=isNaN(t);return(n||0<=t)&&r(e,!n)}}),a("<a>").outerWidth(1).jquery||a.each(["Width","Height"],function(e,n){var r="Width"===n?["Left","Right"]:["Top","Bottom"],i=n.toLowerCase(),o={innerWidth:a.fn.innerWidth,innerHeight:a.fn.innerHeight,outerWidth:a.fn.outerWidth,outerHeight:a.fn.outerHeight};function s(e,t,n,i){return a.each(r,function(){t-=parseFloat(a.css(e,"padding"+this))||0,n&&(t-=parseFloat(a.css(e,"border"+this+"Width"))||0),i&&(t-=parseFloat(a.css(e,"margin"+this))||0)}),t}a.fn["inner"+n]=function(e){return void 0===e?o["inner"+n].call(this):this.each(function(){a(this).css(i,s(this,e)+"px")})},a.fn["outer"+n]=function(e,t){return"number"!=typeof e?o["outer"+n].call(this,e):this.each(function(){a(this).css(i,s(this,e,!0,t)+"px")})}}),a.fn.addBack||(a.fn.addBack=function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}),a("<a>").data("a-b","a").removeData("a-b").data("a-b")&&(a.fn.removeData=(t=a.fn.removeData,function(e){return arguments.length?t.call(this,a.camelCase(e)):t.call(this)})),a.ui.ie=!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()),a.fn.extend({focus:(i=a.fn.focus,function(t,n){return"number"==typeof t?this.each(function(){var e=this;setTimeout(function(){a(e).focus(),n&&n.call(e)},t)}):i.apply(this,arguments)}),disableSelection:(n="onselectstart"in document.createElement("div")?"selectstart":"mousedown",function(){return this.bind(n+".ui-disableSelection",function(e){e.preventDefault()})}),enableSelection:function(){return this.unbind(".ui-disableSelection")},zIndex:function(e){if(void 0!==e)return this.css("zIndex",e);if(this.length)for(var t,n,i=a(this[0]);i.length&&i[0]!==document;){if(("absolute"===(t=i.css("position"))||"relative"===t||"fixed"===t)&&(n=parseInt(i.css("zIndex"),10),!isNaN(n)&&0!==n))return n;i=i.parent()}return 0}}),a.ui.plugin={add:function(e,t,n){var i,r=a.ui[e].prototype;for(i in n)r.plugins[i]=r.plugins[i]||[],r.plugins[i].push([t,n[i]])},call:function(e,t,n,i){var r,o=e.plugins[t];if(o&&(i||e.element[0].parentNode&&11!==e.element[0].parentNode.nodeType))for(r=0;r<o.length;r++)e.options[o[r][0]]&&o[r][1].apply(e.element,n)}}});;
/*!
 * jQuery UI Datepicker 1.11.4
 * http://jqueryui.com
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/datepicker/
 */
!function(e){"function"==typeof define&&define.amd?define(["jquery","./core"],e):e(jQuery)}(function(b){var r;function e(){this._curInst=null,this._keyEvent=!1,this._disabledInputs=[],this._datepickerShowing=!1,this._inDialog=!1,this._mainDivId="ui-datepicker-div",this._inlineClass="ui-datepicker-inline",this._appendClass="ui-datepicker-append",this._triggerClass="ui-datepicker-trigger",this._dialogClass="ui-datepicker-dialog",this._disableClass="ui-datepicker-disabled",this._unselectableClass="ui-datepicker-unselectable",this._currentClass="ui-datepicker-current-day",this._dayOverClass="ui-datepicker-days-cell-over",this.regional=[],this.regional[""]={closeText:"Done",prevText:"Prev",nextText:"Next",currentText:"Today",monthNames:["January","February","March","April","May","June","July","August","September","October","November","December"],monthNamesShort:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],dayNames:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],dayNamesShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],dayNamesMin:["Su","Mo","Tu","We","Th","Fr","Sa"],weekHeader:"Wk",dateFormat:"mm/dd/yy",firstDay:0,isRTL:!1,showMonthAfterYear:!1,yearSuffix:""},this._defaults={showOn:"focus",showAnim:"fadeIn",showOptions:{},defaultDate:null,appendText:"",buttonText:"...",buttonImage:"",buttonImageOnly:!1,hideIfNoPrevNext:!1,navigationAsDateFormat:!1,gotoCurrent:!1,changeMonth:!1,changeYear:!1,yearRange:"c-10:c+10",showOtherMonths:!1,selectOtherMonths:!1,showWeek:!1,calculateWeek:this.iso8601Week,shortYearCutoff:"+10",minDate:null,maxDate:null,duration:"fast",beforeShowDay:null,beforeShow:null,onSelect:null,onChangeMonthYear:null,onClose:null,numberOfMonths:1,showCurrentAtPos:0,stepMonths:1,stepBigMonths:12,altField:"",altFormat:"",constrainInput:!0,showButtonPanel:!1,autoSize:!1,disabled:!1},b.extend(this._defaults,this.regional[""]),this.regional.en=b.extend(!0,{},this.regional[""]),this.regional["en-US"]=b.extend(!0,{},this.regional.en),this.dpDiv=a(b("<div id='"+this._mainDivId+"' class='ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>"))}function a(e){var t="button, .ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a";return e.delegate(t,"mouseout",function(){b(this).removeClass("ui-state-hover"),-1!==this.className.indexOf("ui-datepicker-prev")&&b(this).removeClass("ui-datepicker-prev-hover"),-1!==this.className.indexOf("ui-datepicker-next")&&b(this).removeClass("ui-datepicker-next-hover")}).delegate(t,"mouseover",n)}function n(){b.datepicker._isDisabledDatepicker(r.inline?r.dpDiv.parent()[0]:r.input[0])||(b(this).parents(".ui-datepicker-calendar").find("a").removeClass("ui-state-hover"),b(this).addClass("ui-state-hover"),-1!==this.className.indexOf("ui-datepicker-prev")&&b(this).addClass("ui-datepicker-prev-hover"),-1!==this.className.indexOf("ui-datepicker-next")&&b(this).addClass("ui-datepicker-next-hover"))}function h(e,t){for(var a in b.extend(e,t),t)null==t[a]&&(e[a]=t[a]);return e}return b.extend(b.ui,{datepicker:{version:"1.11.4"}}),b.extend(e.prototype,{markerClassName:"hasDatepicker",maxRows:4,_widgetDatepicker:function(){return this.dpDiv},setDefaults:function(e){return h(this._defaults,e||{}),this},_attachDatepicker:function(e,t){var a,i,s;i="div"===(a=e.nodeName.toLowerCase())||"span"===a,e.id||(this.uuid+=1,e.id="dp"+this.uuid),(s=this._newInst(b(e),i)).settings=b.extend({},t||{}),"input"===a?this._connectDatepicker(e,s):i&&this._inlineDatepicker(e,s)},_newInst:function(e,t){return{id:e[0].id.replace(/([^A-Za-z0-9_\-])/g,"\\\\$1"),input:e,selectedDay:0,selectedMonth:0,selectedYear:0,drawMonth:0,drawYear:0,inline:t,dpDiv:t?a(b("<div class='"+this._inlineClass+" ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>")):this.dpDiv}},_connectDatepicker:function(e,t){var a=b(e);t.append=b([]),t.trigger=b([]),a.hasClass(this.markerClassName)||(this._attachments(a,t),a.addClass(this.markerClassName).keydown(this._doKeyDown).keypress(this._doKeyPress).keyup(this._doKeyUp),this._autoSize(t),b.data(e,"datepicker",t),t.settings.disabled&&this._disableDatepicker(e))},_attachments:function(e,t){var a,i,s,r=this._get(t,"appendText"),n=this._get(t,"isRTL");t.append&&t.append.remove(),r&&(t.append=b("<span class='"+this._appendClass+"'>"+r+"</span>"),e[n?"before":"after"](t.append)),e.unbind("focus",this._showDatepicker),t.trigger&&t.trigger.remove(),"focus"!==(a=this._get(t,"showOn"))&&"both"!==a||e.focus(this._showDatepicker),"button"!==a&&"both"!==a||(i=this._get(t,"buttonText"),s=this._get(t,"buttonImage"),t.trigger=b(this._get(t,"buttonImageOnly")?b("<img/>").addClass(this._triggerClass).attr({src:s,alt:i,title:i}):b("<button type='button'></button>").addClass(this._triggerClass).html(s?b("<img/>").attr({src:s,alt:i,title:i}):i)),e[n?"before":"after"](t.trigger),t.trigger.click(function(){return b.datepicker._datepickerShowing&&b.datepicker._lastInput===e[0]?b.datepicker._hideDatepicker():(b.datepicker._datepickerShowing&&b.datepicker._lastInput!==e[0]&&b.datepicker._hideDatepicker(),b.datepicker._showDatepicker(e[0])),!1}))},_autoSize:function(e){if(this._get(e,"autoSize")&&!e.inline){var t,a,i,s,r=new Date(2009,11,20),n=this._get(e,"dateFormat");n.match(/[DM]/)&&(t=function(e){for(s=i=a=0;s<e.length;s++)e[s].length>a&&(a=e[s].length,i=s);return i},r.setMonth(t(this._get(e,n.match(/MM/)?"monthNames":"monthNamesShort"))),r.setDate(t(this._get(e,n.match(/DD/)?"dayNames":"dayNamesShort"))+20-r.getDay())),e.input.attr("size",this._formatDate(e,r).length)}},_inlineDatepicker:function(e,t){var a=b(e);a.hasClass(this.markerClassName)||(a.addClass(this.markerClassName).append(t.dpDiv),b.data(e,"datepicker",t),this._setDate(t,this._getDefaultDate(t),!0),this._updateDatepicker(t),this._updateAlternate(t),t.settings.disabled&&this._disableDatepicker(e),t.dpDiv.css("display","block"))},_dialogDatepicker:function(e,t,a,i,s){var r,n,d,c,o,l=this._dialogInst;return l||(this.uuid+=1,r="dp"+this.uuid,this._dialogInput=b("<input type='text' id='"+r+"' style='position: absolute; top: -100px; width: 0px;'/>"),this._dialogInput.keydown(this._doKeyDown),b("body").append(this._dialogInput),(l=this._dialogInst=this._newInst(this._dialogInput,!1)).settings={},b.data(this._dialogInput[0],"datepicker",l)),h(l.settings,i||{}),t=t&&t.constructor===Date?this._formatDate(l,t):t,this._dialogInput.val(t),this._pos=s?s.length?s:[s.pageX,s.pageY]:null,this._pos||(n=document.documentElement.clientWidth,d=document.documentElement.clientHeight,c=document.documentElement.scrollLeft||document.body.scrollLeft,o=document.documentElement.scrollTop||document.body.scrollTop,this._pos=[n/2-100+c,d/2-150+o]),this._dialogInput.css("left",this._pos[0]+20+"px").css("top",this._pos[1]+"px"),l.settings.onSelect=a,this._inDialog=!0,this.dpDiv.addClass(this._dialogClass),this._showDatepicker(this._dialogInput[0]),b.blockUI&&b.blockUI(this.dpDiv),b.data(this._dialogInput[0],"datepicker",l),this},_destroyDatepicker:function(e){var t,a=b(e),i=b.data(e,"datepicker");a.hasClass(this.markerClassName)&&(t=e.nodeName.toLowerCase(),b.removeData(e,"datepicker"),"input"===t?(i.append.remove(),i.trigger.remove(),a.removeClass(this.markerClassName).unbind("focus",this._showDatepicker).unbind("keydown",this._doKeyDown).unbind("keypress",this._doKeyPress).unbind("keyup",this._doKeyUp)):"div"!==t&&"span"!==t||a.removeClass(this.markerClassName).empty(),r===i&&(r=null))},_enableDatepicker:function(t){var e,a,i=b(t),s=b.data(t,"datepicker");i.hasClass(this.markerClassName)&&("input"===(e=t.nodeName.toLowerCase())?(t.disabled=!1,s.trigger.filter("button").each(function(){this.disabled=!1}).end().filter("img").css({opacity:"1.0",cursor:""})):"div"!==e&&"span"!==e||((a=i.children("."+this._inlineClass)).children().removeClass("ui-state-disabled"),a.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled",!1)),this._disabledInputs=b.map(this._disabledInputs,function(e){return e===t?null:e}))},_disableDatepicker:function(t){var e,a,i=b(t),s=b.data(t,"datepicker");i.hasClass(this.markerClassName)&&("input"===(e=t.nodeName.toLowerCase())?(t.disabled=!0,s.trigger.filter("button").each(function(){this.disabled=!0}).end().filter("img").css({opacity:"0.5",cursor:"default"})):"div"!==e&&"span"!==e||((a=i.children("."+this._inlineClass)).children().addClass("ui-state-disabled"),a.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled",!0)),this._disabledInputs=b.map(this._disabledInputs,function(e){return e===t?null:e}),this._disabledInputs[this._disabledInputs.length]=t)},_isDisabledDatepicker:function(e){if(!e)return!1;for(var t=0;t<this._disabledInputs.length;t++)if(this._disabledInputs[t]===e)return!0;return!1},_getInst:function(e){try{return b.data(e,"datepicker")}catch(e){throw"Missing instance data for this datepicker"}},_optionDatepicker:function(e,t,a){var i,s,r,n,d=this._getInst(e);if(2===arguments.length&&"string"==typeof t)return"defaults"===t?b.extend({},b.datepicker._defaults):d?"all"===t?b.extend({},d.settings):this._get(d,t):null;i=t||{},"string"==typeof t&&((i={})[t]=a),d&&(this._curInst===d&&this._hideDatepicker(),s=this._getDateDatepicker(e,!0),r=this._getMinMaxDate(d,"min"),n=this._getMinMaxDate(d,"max"),h(d.settings,i),null!==r&&void 0!==i.dateFormat&&void 0===i.minDate&&(d.settings.minDate=this._formatDate(d,r)),null!==n&&void 0!==i.dateFormat&&void 0===i.maxDate&&(d.settings.maxDate=this._formatDate(d,n)),"disabled"in i&&(i.disabled?this._disableDatepicker(e):this._enableDatepicker(e)),this._attachments(b(e),d),this._autoSize(d),this._setDate(d,s),this._updateAlternate(d),this._updateDatepicker(d))},_changeDatepicker:function(e,t,a){this._optionDatepicker(e,t,a)},_refreshDatepicker:function(e){var t=this._getInst(e);t&&this._updateDatepicker(t)},_setDateDatepicker:function(e,t){var a=this._getInst(e);a&&(this._setDate(a,t),this._updateDatepicker(a),this._updateAlternate(a))},_getDateDatepicker:function(e,t){var a=this._getInst(e);return a&&!a.inline&&this._setDateFromField(a,t),a?this._getDate(a):null},_doKeyDown:function(e){var t,a,i,s=b.datepicker._getInst(e.target),r=!0,n=s.dpDiv.is(".ui-datepicker-rtl");if(s._keyEvent=!0,b.datepicker._datepickerShowing)switch(e.keyCode){case 9:b.datepicker._hideDatepicker(),r=!1;break;case 13:return(i=b("td."+b.datepicker._dayOverClass+":not(."+b.datepicker._currentClass+")",s.dpDiv))[0]&&b.datepicker._selectDay(e.target,s.selectedMonth,s.selectedYear,i[0]),(t=b.datepicker._get(s,"onSelect"))?(a=b.datepicker._formatDate(s),t.apply(s.input?s.input[0]:null,[a,s])):b.datepicker._hideDatepicker(),!1;case 27:b.datepicker._hideDatepicker();break;case 33:b.datepicker._adjustDate(e.target,e.ctrlKey?-b.datepicker._get(s,"stepBigMonths"):-b.datepicker._get(s,"stepMonths"),"M");break;case 34:b.datepicker._adjustDate(e.target,e.ctrlKey?+b.datepicker._get(s,"stepBigMonths"):+b.datepicker._get(s,"stepMonths"),"M");break;case 35:(e.ctrlKey||e.metaKey)&&b.datepicker._clearDate(e.target),r=e.ctrlKey||e.metaKey;break;case 36:(e.ctrlKey||e.metaKey)&&b.datepicker._gotoToday(e.target),r=e.ctrlKey||e.metaKey;break;case 37:(e.ctrlKey||e.metaKey)&&b.datepicker._adjustDate(e.target,n?1:-1,"D"),r=e.ctrlKey||e.metaKey,e.originalEvent.altKey&&b.datepicker._adjustDate(e.target,e.ctrlKey?-b.datepicker._get(s,"stepBigMonths"):-b.datepicker._get(s,"stepMonths"),"M");break;case 38:(e.ctrlKey||e.metaKey)&&b.datepicker._adjustDate(e.target,-7,"D"),r=e.ctrlKey||e.metaKey;break;case 39:(e.ctrlKey||e.metaKey)&&b.datepicker._adjustDate(e.target,n?-1:1,"D"),r=e.ctrlKey||e.metaKey,e.originalEvent.altKey&&b.datepicker._adjustDate(e.target,e.ctrlKey?+b.datepicker._get(s,"stepBigMonths"):+b.datepicker._get(s,"stepMonths"),"M");break;case 40:(e.ctrlKey||e.metaKey)&&b.datepicker._adjustDate(e.target,7,"D"),r=e.ctrlKey||e.metaKey;break;default:r=!1}else 36===e.keyCode&&e.ctrlKey?b.datepicker._showDatepicker(this):r=!1;r&&(e.preventDefault(),e.stopPropagation())},_doKeyPress:function(e){var t,a,i=b.datepicker._getInst(e.target);if(b.datepicker._get(i,"constrainInput"))return t=b.datepicker._possibleChars(b.datepicker._get(i,"dateFormat")),a=String.fromCharCode(null==e.charCode?e.keyCode:e.charCode),e.ctrlKey||e.metaKey||a<" "||!t||-1<t.indexOf(a)},_doKeyUp:function(e){var t=b.datepicker._getInst(e.target);if(t.input.val()!==t.lastVal)try{b.datepicker.parseDate(b.datepicker._get(t,"dateFormat"),t.input?t.input.val():null,b.datepicker._getFormatConfig(t))&&(b.datepicker._setDateFromField(t),b.datepicker._updateAlternate(t),b.datepicker._updateDatepicker(t))}catch(e){}return!0},_showDatepicker:function(e){var t,a,i,s,r,n,d;"input"!==(e=e.target||e).nodeName.toLowerCase()&&(e=b("input",e.parentNode)[0]),b.datepicker._isDisabledDatepicker(e)||b.datepicker._lastInput===e||(t=b.datepicker._getInst(e),b.datepicker._curInst&&b.datepicker._curInst!==t&&(b.datepicker._curInst.dpDiv.stop(!0,!0),t&&b.datepicker._datepickerShowing&&b.datepicker._hideDatepicker(b.datepicker._curInst.input[0])),!1!==(i=(a=b.datepicker._get(t,"beforeShow"))?a.apply(e,[e,t]):{})&&(h(t.settings,i),t.lastVal=null,b.datepicker._lastInput=e,b.datepicker._setDateFromField(t),b.datepicker._inDialog&&(e.value=""),b.datepicker._pos||(b.datepicker._pos=b.datepicker._findPos(e),b.datepicker._pos[1]+=e.offsetHeight),s=!1,b(e).parents().each(function(){return!(s|="fixed"===b(this).css("position"))}),r={left:b.datepicker._pos[0],top:b.datepicker._pos[1]},b.datepicker._pos=null,t.dpDiv.empty(),t.dpDiv.css({position:"absolute",display:"block",top:"-1000px"}),b.datepicker._updateDatepicker(t),r=b.datepicker._checkOffset(t,r,s),t.dpDiv.css({position:b.datepicker._inDialog&&b.blockUI?"static":s?"fixed":"absolute",display:"none",left:r.left+"px",top:r.top+"px"}),t.inline||(n=b.datepicker._get(t,"showAnim"),d=b.datepicker._get(t,"duration"),t.dpDiv.css("z-index",function(e){for(var t,a;e.length&&e[0]!==document;){if(("absolute"===(t=e.css("position"))||"relative"===t||"fixed"===t)&&(a=parseInt(e.css("zIndex"),10),!isNaN(a)&&0!==a))return a;e=e.parent()}return 0}(b(e))+1),b.datepicker._datepickerShowing=!0,b.effects&&b.effects.effect[n]?t.dpDiv.show(n,b.datepicker._get(t,"showOptions"),d):t.dpDiv[n||"show"](n?d:null),b.datepicker._shouldFocusInput(t)&&t.input.focus(),b.datepicker._curInst=t)))},_updateDatepicker:function(e){this.maxRows=4,(r=e).dpDiv.empty().append(this._generateHTML(e)),this._attachHandlers(e);var t,a=this._getNumberOfMonths(e),i=a[1],s=e.dpDiv.find("."+this._dayOverClass+" a");0<s.length&&n.apply(s.get(0)),e.dpDiv.removeClass("ui-datepicker-multi-2 ui-datepicker-multi-3 ui-datepicker-multi-4").width(""),1<i&&e.dpDiv.addClass("ui-datepicker-multi-"+i).css("width",17*i+"em"),e.dpDiv[(1!==a[0]||1!==a[1]?"add":"remove")+"Class"]("ui-datepicker-multi"),e.dpDiv[(this._get(e,"isRTL")?"add":"remove")+"Class"]("ui-datepicker-rtl"),e===b.datepicker._curInst&&b.datepicker._datepickerShowing&&b.datepicker._shouldFocusInput(e)&&e.input.focus(),e.yearshtml&&(t=e.yearshtml,setTimeout(function(){t===e.yearshtml&&e.yearshtml&&e.dpDiv.find("select.ui-datepicker-year:first").replaceWith(e.yearshtml),t=e.yearshtml=null},0))},_shouldFocusInput:function(e){return e.input&&e.input.is(":visible")&&!e.input.is(":disabled")&&!e.input.is(":focus")},_checkOffset:function(e,t,a){var i=e.dpDiv.outerWidth(),s=e.dpDiv.outerHeight(),r=e.input?e.input.outerWidth():0,n=e.input?e.input.outerHeight():0,d=document.documentElement.clientWidth+(a?0:b(document).scrollLeft()),c=document.documentElement.clientHeight+(a?0:b(document).scrollTop());return t.left-=this._get(e,"isRTL")?i-r:0,t.left-=a&&t.left===e.input.offset().left?b(document).scrollLeft():0,t.top-=a&&t.top===e.input.offset().top+n?b(document).scrollTop():0,t.left-=Math.min(t.left,t.left+i>d&&i<d?Math.abs(t.left+i-d):0),t.top-=Math.min(t.top,t.top+s>c&&s<c?Math.abs(s+n):0),t},_findPos:function(e){for(var t,a=this._getInst(e),i=this._get(a,"isRTL");e&&("hidden"===e.type||1!==e.nodeType||b.expr.filters.hidden(e));)e=e[i?"previousSibling":"nextSibling"];return[(t=b(e).offset()).left,t.top]},_hideDatepicker:function(e){var t,a,i,s,r=this._curInst;!r||e&&r!==b.data(e,"datepicker")||this._datepickerShowing&&(t=this._get(r,"showAnim"),a=this._get(r,"duration"),i=function(){b.datepicker._tidyDialog(r)},b.effects&&(b.effects.effect[t]||b.effects[t])?r.dpDiv.hide(t,b.datepicker._get(r,"showOptions"),a,i):r.dpDiv["slideDown"===t?"slideUp":"fadeIn"===t?"fadeOut":"hide"](t?a:null,i),t||i(),this._datepickerShowing=!1,(s=this._get(r,"onClose"))&&s.apply(r.input?r.input[0]:null,[r.input?r.input.val():"",r]),this._lastInput=null,this._inDialog&&(this._dialogInput.css({position:"absolute",left:"0",top:"-100px"}),b.blockUI&&(b.unblockUI(),b("body").append(this.dpDiv))),this._inDialog=!1)},_tidyDialog:function(e){e.dpDiv.removeClass(this._dialogClass).unbind(".ui-datepicker-calendar")},_checkExternalClick:function(e){if(b.datepicker._curInst){var t=b(e.target),a=b.datepicker._getInst(t[0]);(t[0].id===b.datepicker._mainDivId||0!==t.parents("#"+b.datepicker._mainDivId).length||t.hasClass(b.datepicker.markerClassName)||t.closest("."+b.datepicker._triggerClass).length||!b.datepicker._datepickerShowing||b.datepicker._inDialog&&b.blockUI)&&(!t.hasClass(b.datepicker.markerClassName)||b.datepicker._curInst===a)||b.datepicker._hideDatepicker()}},_adjustDate:function(e,t,a){var i=b(e),s=this._getInst(i[0]);this._isDisabledDatepicker(i[0])||(this._adjustInstDate(s,t+("M"===a?this._get(s,"showCurrentAtPos"):0),a),this._updateDatepicker(s))},_gotoToday:function(e){var t,a=b(e),i=this._getInst(a[0]);this._get(i,"gotoCurrent")&&i.currentDay?(i.selectedDay=i.currentDay,i.drawMonth=i.selectedMonth=i.currentMonth,i.drawYear=i.selectedYear=i.currentYear):(t=new Date,i.selectedDay=t.getDate(),i.drawMonth=i.selectedMonth=t.getMonth(),i.drawYear=i.selectedYear=t.getFullYear()),this._notifyChange(i),this._adjustDate(a)},_selectMonthYear:function(e,t,a){var i=b(e),s=this._getInst(i[0]);s["selected"+("M"===a?"Month":"Year")]=s["draw"+("M"===a?"Month":"Year")]=parseInt(t.options[t.selectedIndex].value,10),this._notifyChange(s),this._adjustDate(i)},_selectDay:function(e,t,a,i){var s,r=b(e);b(i).hasClass(this._unselectableClass)||this._isDisabledDatepicker(r[0])||((s=this._getInst(r[0])).selectedDay=s.currentDay=b("a",i).html(),s.selectedMonth=s.currentMonth=t,s.selectedYear=s.currentYear=a,this._selectDate(e,this._formatDate(s,s.currentDay,s.currentMonth,s.currentYear)))},_clearDate:function(e){var t=b(e);this._selectDate(t,"")},_selectDate:function(e,t){var a,i=b(e),s=this._getInst(i[0]);t=null!=t?t:this._formatDate(s),s.input&&s.input.val(t),this._updateAlternate(s),(a=this._get(s,"onSelect"))?a.apply(s.input?s.input[0]:null,[t,s]):s.input&&s.input.trigger("change"),s.inline?this._updateDatepicker(s):(this._hideDatepicker(),this._lastInput=s.input[0],"object"!=typeof s.input[0]&&s.input.focus(),this._lastInput=null)},_updateAlternate:function(e){var t,a,i,s=this._get(e,"altField");s&&(t=this._get(e,"altFormat")||this._get(e,"dateFormat"),a=this._getDate(e),i=this.formatDate(t,a,this._getFormatConfig(e)),b(s).each(function(){b(this).val(i)}))},noWeekends:function(e){var t=e.getDay();return[0<t&&t<6,""]},iso8601Week:function(e){var t,a=new Date(e.getTime());return a.setDate(a.getDate()+4-(a.getDay()||7)),t=a.getTime(),a.setMonth(0),a.setDate(1),Math.floor(Math.round((t-a)/864e5)/7)+1},parseDate:function(a,r,e){if(null==a||null==r)throw"Invalid arguments";if(""===(r="object"==typeof r?r.toString():r+""))return null;function n(e){var t=d+1<a.length&&a.charAt(d+1)===e;return t&&d++,t}function t(e){var t=n(e),a="@"===e?14:"!"===e?20:"y"===e&&t?4:"o"===e?3:2,i=new RegExp("^\\d{"+("y"===e?a:1)+","+a+"}"),s=r.substring(h).match(i);if(!s)throw"Missing number at position "+h;return h+=s[0].length,parseInt(s[0],10)}function i(e,t,a){var i=-1,s=b.map(n(e)?a:t,function(e,t){return[[t,e]]}).sort(function(e,t){return-(e[1].length-t[1].length)});if(b.each(s,function(e,t){var a=t[1];if(r.substr(h,a.length).toLowerCase()===a.toLowerCase())return i=t[0],h+=a.length,!1}),-1!==i)return i+1;throw"Unknown name at position "+h}function s(){if(r.charAt(h)!==a.charAt(d))throw"Unexpected literal at position "+h;h++}var d,c,o,l,h=0,u=(e?e.shortYearCutoff:null)||this._defaults.shortYearCutoff,p="string"!=typeof u?u:(new Date).getFullYear()%100+parseInt(u,10),g=(e?e.dayNamesShort:null)||this._defaults.dayNamesShort,_=(e?e.dayNames:null)||this._defaults.dayNames,f=(e?e.monthNamesShort:null)||this._defaults.monthNamesShort,k=(e?e.monthNames:null)||this._defaults.monthNames,D=-1,m=-1,y=-1,v=-1,M=!1;for(d=0;d<a.length;d++)if(M)"'"!==a.charAt(d)||n("'")?s():M=!1;else switch(a.charAt(d)){case"d":y=t("d");break;case"D":i("D",g,_);break;case"o":v=t("o");break;case"m":m=t("m");break;case"M":m=i("M",f,k);break;case"y":D=t("y");break;case"@":D=(l=new Date(t("@"))).getFullYear(),m=l.getMonth()+1,y=l.getDate();break;case"!":D=(l=new Date((t("!")-this._ticksTo1970)/1e4)).getFullYear(),m=l.getMonth()+1,y=l.getDate();break;case"'":n("'")?s():M=!0;break;default:s()}if(h<r.length&&(o=r.substr(h),!/^\s+/.test(o)))throw"Extra/unparsed characters found in date: "+o;if(-1===D?D=(new Date).getFullYear():D<100&&(D+=(new Date).getFullYear()-(new Date).getFullYear()%100+(D<=p?0:-100)),-1<v)for(m=1,y=v;;){if(y<=(c=this._getDaysInMonth(D,m-1)))break;m++,y-=c}if((l=this._daylightSavingAdjust(new Date(D,m-1,y))).getFullYear()!==D||l.getMonth()+1!==m||l.getDate()!==y)throw"Invalid date";return l},ATOM:"yy-mm-dd",COOKIE:"D, dd M yy",ISO_8601:"yy-mm-dd",RFC_822:"D, d M y",RFC_850:"DD, dd-M-y",RFC_1036:"D, d M y",RFC_1123:"D, d M yy",RFC_2822:"D, d M yy",RSS:"D, d M y",TICKS:"!",TIMESTAMP:"@",W3C:"yy-mm-dd",_ticksTo1970:24*(718685+Math.floor(492.5)-Math.floor(19.7)+Math.floor(4.925))*60*60*1e7,formatDate:function(a,e,t){if(!e)return"";function s(e){var t=n+1<a.length&&a.charAt(n+1)===e;return t&&n++,t}function i(e,t,a){var i=""+t;if(s(e))for(;i.length<a;)i="0"+i;return i}function r(e,t,a,i){return s(e)?i[t]:a[t]}var n,d=(t?t.dayNamesShort:null)||this._defaults.dayNamesShort,c=(t?t.dayNames:null)||this._defaults.dayNames,o=(t?t.monthNamesShort:null)||this._defaults.monthNamesShort,l=(t?t.monthNames:null)||this._defaults.monthNames,h="",u=!1;if(e)for(n=0;n<a.length;n++)if(u)"'"!==a.charAt(n)||s("'")?h+=a.charAt(n):u=!1;else switch(a.charAt(n)){case"d":h+=i("d",e.getDate(),2);break;case"D":h+=r("D",e.getDay(),d,c);break;case"o":h+=i("o",Math.round((new Date(e.getFullYear(),e.getMonth(),e.getDate()).getTime()-new Date(e.getFullYear(),0,0).getTime())/864e5),3);break;case"m":h+=i("m",e.getMonth()+1,2);break;case"M":h+=r("M",e.getMonth(),o,l);break;case"y":h+=s("y")?e.getFullYear():(e.getYear()%100<10?"0":"")+e.getYear()%100;break;case"@":h+=e.getTime();break;case"!":h+=1e4*e.getTime()+this._ticksTo1970;break;case"'":s("'")?h+="'":u=!0;break;default:h+=a.charAt(n)}return h},_possibleChars:function(a){function e(e){var t=i+1<a.length&&a.charAt(i+1)===e;return t&&i++,t}var i,t="",s=!1;for(i=0;i<a.length;i++)if(s)"'"!==a.charAt(i)||e("'")?t+=a.charAt(i):s=!1;else switch(a.charAt(i)){case"d":case"m":case"y":case"@":t+="0123456789";break;case"D":case"M":return null;case"'":e("'")?t+="'":s=!0;break;default:t+=a.charAt(i)}return t},_get:function(e,t){return void 0!==e.settings[t]?e.settings[t]:this._defaults[t]},_setDateFromField:function(e,t){if(e.input.val()!==e.lastVal){var a=this._get(e,"dateFormat"),i=e.lastVal=e.input?e.input.val():null,s=this._getDefaultDate(e),r=s,n=this._getFormatConfig(e);try{r=this.parseDate(a,i,n)||s}catch(e){i=t?"":i}e.selectedDay=r.getDate(),e.drawMonth=e.selectedMonth=r.getMonth(),e.drawYear=e.selectedYear=r.getFullYear(),e.currentDay=i?r.getDate():0,e.currentMonth=i?r.getMonth():0,e.currentYear=i?r.getFullYear():0,this._adjustInstDate(e)}},_getDefaultDate:function(e){return this._restrictMinMax(e,this._determineDate(e,this._get(e,"defaultDate"),new Date))},_determineDate:function(d,e,t){var a,i,s=null==e||""===e?t:"string"==typeof e?function(e){try{return b.datepicker.parseDate(b.datepicker._get(d,"dateFormat"),e,b.datepicker._getFormatConfig(d))}catch(e){}for(var t=(e.toLowerCase().match(/^c/)?b.datepicker._getDate(d):null)||new Date,a=t.getFullYear(),i=t.getMonth(),s=t.getDate(),r=/([+\-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g,n=r.exec(e);n;){switch(n[2]||"d"){case"d":case"D":s+=parseInt(n[1],10);break;case"w":case"W":s+=7*parseInt(n[1],10);break;case"m":case"M":i+=parseInt(n[1],10),s=Math.min(s,b.datepicker._getDaysInMonth(a,i));break;case"y":case"Y":a+=parseInt(n[1],10),s=Math.min(s,b.datepicker._getDaysInMonth(a,i))}n=r.exec(e)}return new Date(a,i,s)}(e):"number"==typeof e?isNaN(e)?t:(a=e,(i=new Date).setDate(i.getDate()+a),i):new Date(e.getTime());return(s=s&&"Invalid Date"===s.toString()?t:s)&&(s.setHours(0),s.setMinutes(0),s.setSeconds(0),s.setMilliseconds(0)),this._daylightSavingAdjust(s)},_daylightSavingAdjust:function(e){return e?(e.setHours(12<e.getHours()?e.getHours()+2:0),e):null},_setDate:function(e,t,a){var i=!t,s=e.selectedMonth,r=e.selectedYear,n=this._restrictMinMax(e,this._determineDate(e,t,new Date));e.selectedDay=e.currentDay=n.getDate(),e.drawMonth=e.selectedMonth=e.currentMonth=n.getMonth(),e.drawYear=e.selectedYear=e.currentYear=n.getFullYear(),s===e.selectedMonth&&r===e.selectedYear||a||this._notifyChange(e),this._adjustInstDate(e),e.input&&e.input.val(i?"":this._formatDate(e))},_getDate:function(e){return!e.currentYear||e.input&&""===e.input.val()?null:this._daylightSavingAdjust(new Date(e.currentYear,e.currentMonth,e.currentDay))},_attachHandlers:function(e){var t=this._get(e,"stepMonths"),a="#"+e.id.replace(/\\\\/g,"\\");e.dpDiv.find("[data-handler]").map(function(){var e={prev:function(){b.datepicker._adjustDate(a,-t,"M")},next:function(){b.datepicker._adjustDate(a,+t,"M")},hide:function(){b.datepicker._hideDatepicker()},today:function(){b.datepicker._gotoToday(a)},selectDay:function(){return b.datepicker._selectDay(a,+this.getAttribute("data-month"),+this.getAttribute("data-year"),this),!1},selectMonth:function(){return b.datepicker._selectMonthYear(a,this,"M"),!1},selectYear:function(){return b.datepicker._selectMonthYear(a,this,"Y"),!1}};b(this).bind(this.getAttribute("data-event"),e[this.getAttribute("data-handler")])})},_generateHTML:function(e){var t,a,i,s,r,n,d,c,o,l,h,u,p,g,_,f,k,D,m,y,v,M,b,w,C,I,x,Y,S,N,F,T,A,K,j,O,R,L,W,E=new Date,H=this._daylightSavingAdjust(new Date(E.getFullYear(),E.getMonth(),E.getDate())),P=this._get(e,"isRTL"),U=this._get(e,"showButtonPanel"),z=this._get(e,"hideIfNoPrevNext"),B=this._get(e,"navigationAsDateFormat"),J=this._getNumberOfMonths(e),V=this._get(e,"showCurrentAtPos"),q=this._get(e,"stepMonths"),Q=1!==J[0]||1!==J[1],X=this._daylightSavingAdjust(e.currentDay?new Date(e.currentYear,e.currentMonth,e.currentDay):new Date(9999,9,9)),Z=this._getMinMaxDate(e,"min"),$=this._getMinMaxDate(e,"max"),G=e.drawMonth-V,ee=e.drawYear;if(G<0&&(G+=12,ee--),$)for(t=this._daylightSavingAdjust(new Date($.getFullYear(),$.getMonth()-J[0]*J[1]+1,$.getDate())),t=Z&&t<Z?Z:t;this._daylightSavingAdjust(new Date(ee,G,1))>t;)--G<0&&(G=11,ee--);for(e.drawMonth=G,e.drawYear=ee,a=this._get(e,"prevText"),a=B?this.formatDate(a,this._daylightSavingAdjust(new Date(ee,G-q,1)),this._getFormatConfig(e)):a,i=this._canAdjustMonth(e,-1,ee,G)?"<a class='ui-datepicker-prev ui-corner-all' data-handler='prev' data-event='click' title='"+a+"'><span class='ui-icon ui-icon-circle-triangle-"+(P?"e":"w")+"'>"+a+"</span></a>":z?"":"<a class='ui-datepicker-prev ui-corner-all ui-state-disabled' title='"+a+"'><span class='ui-icon ui-icon-circle-triangle-"+(P?"e":"w")+"'>"+a+"</span></a>",s=this._get(e,"nextText"),s=B?this.formatDate(s,this._daylightSavingAdjust(new Date(ee,G+q,1)),this._getFormatConfig(e)):s,r=this._canAdjustMonth(e,1,ee,G)?"<a class='ui-datepicker-next ui-corner-all' data-handler='next' data-event='click' title='"+s+"'><span class='ui-icon ui-icon-circle-triangle-"+(P?"w":"e")+"'>"+s+"</span></a>":z?"":"<a class='ui-datepicker-next ui-corner-all ui-state-disabled' title='"+s+"'><span class='ui-icon ui-icon-circle-triangle-"+(P?"w":"e")+"'>"+s+"</span></a>",n=this._get(e,"currentText"),d=this._get(e,"gotoCurrent")&&e.currentDay?X:H,n=B?this.formatDate(n,d,this._getFormatConfig(e)):n,c=e.inline?"":"<button type='button' class='ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all' data-handler='hide' data-event='click'>"+this._get(e,"closeText")+"</button>",o=U?"<div class='ui-datepicker-buttonpane ui-widget-content'>"+(P?c:"")+(this._isInRange(e,d)?"<button type='button' class='ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all' data-handler='today' data-event='click'>"+n+"</button>":"")+(P?"":c)+"</div>":"",l=parseInt(this._get(e,"firstDay"),10),l=isNaN(l)?0:l,h=this._get(e,"showWeek"),u=this._get(e,"dayNames"),p=this._get(e,"dayNamesMin"),g=this._get(e,"monthNames"),_=this._get(e,"monthNamesShort"),f=this._get(e,"beforeShowDay"),k=this._get(e,"showOtherMonths"),D=this._get(e,"selectOtherMonths"),m=this._getDefaultDate(e),y="",M=0;M<J[0];M++){for(b="",this.maxRows=4,w=0;w<J[1];w++){if(C=this._daylightSavingAdjust(new Date(ee,G,e.selectedDay)),I=" ui-corner-all",x="",Q){if(x+="<div class='ui-datepicker-group",1<J[1])switch(w){case 0:x+=" ui-datepicker-group-first",I=" ui-corner-"+(P?"right":"left");break;case J[1]-1:x+=" ui-datepicker-group-last",I=" ui-corner-"+(P?"left":"right");break;default:x+=" ui-datepicker-group-middle",I=""}x+="'>"}for(x+="<div class='ui-datepicker-header ui-widget-header ui-helper-clearfix"+I+"'>"+(/all|left/.test(I)&&0===M?P?r:i:"")+(/all|right/.test(I)&&0===M?P?i:r:"")+this._generateMonthYearHeader(e,G,ee,Z,$,0<M||0<w,g,_)+"</div><table class='ui-datepicker-calendar'><thead><tr>",Y=h?"<th class='ui-datepicker-week-col'>"+this._get(e,"weekHeader")+"</th>":"",v=0;v<7;v++)Y+="<th scope='col'"+(5<=(v+l+6)%7?" class='ui-datepicker-week-end'":"")+"><span title='"+u[S=(v+l)%7]+"'>"+p[S]+"</span></th>";for(x+=Y+"</tr></thead><tbody>",N=this._getDaysInMonth(ee,G),ee===e.selectedYear&&G===e.selectedMonth&&(e.selectedDay=Math.min(e.selectedDay,N)),F=(this._getFirstDayOfMonth(ee,G)-l+7)%7,T=Math.ceil((F+N)/7),A=Q&&this.maxRows>T?this.maxRows:T,this.maxRows=A,K=this._daylightSavingAdjust(new Date(ee,G,1-F)),j=0;j<A;j++){for(x+="<tr>",O=h?"<td class='ui-datepicker-week-col'>"+this._get(e,"calculateWeek")(K)+"</td>":"",v=0;v<7;v++)R=f?f.apply(e.input?e.input[0]:null,[K]):[!0,""],W=(L=K.getMonth()!==G)&&!D||!R[0]||Z&&K<Z||$&&$<K,O+="<td class='"+(5<=(v+l+6)%7?" ui-datepicker-week-end":"")+(L?" ui-datepicker-other-month":"")+(K.getTime()===C.getTime()&&G===e.selectedMonth&&e._keyEvent||m.getTime()===K.getTime()&&m.getTime()===C.getTime()?" "+this._dayOverClass:"")+(W?" "+this._unselectableClass+" ui-state-disabled":"")+(L&&!k?"":" "+R[1]+(K.getTime()===X.getTime()?" "+this._currentClass:"")+(K.getTime()===H.getTime()?" ui-datepicker-today":""))+"'"+(L&&!k||!R[2]?"":" title='"+R[2].replace(/'/g,"&#39;")+"'")+(W?"":" data-handler='selectDay' data-event='click' data-month='"+K.getMonth()+"' data-year='"+K.getFullYear()+"'")+">"+(L&&!k?"&#xa0;":W?"<span class='ui-state-default'>"+K.getDate()+"</span>":"<a class='ui-state-default"+(K.getTime()===H.getTime()?" ui-state-highlight":"")+(K.getTime()===X.getTime()?" ui-state-active":"")+(L?" ui-priority-secondary":"")+"' href='#'>"+K.getDate()+"</a>")+"</td>",K.setDate(K.getDate()+1),K=this._daylightSavingAdjust(K);x+=O+"</tr>"}11<++G&&(G=0,ee++),b+=x+="</tbody></table>"+(Q?"</div>"+(0<J[0]&&w===J[1]-1?"<div class='ui-datepicker-row-break'></div>":""):"")}y+=b}return y+=o,e._keyEvent=!1,y},_generateMonthYearHeader:function(e,t,a,i,s,r,n,d){var c,o,l,h,u,p,g,_,f=this._get(e,"changeMonth"),k=this._get(e,"changeYear"),D=this._get(e,"showMonthAfterYear"),m="<div class='ui-datepicker-title'>",y="";if(r||!f)y+="<span class='ui-datepicker-month'>"+n[t]+"</span>";else{for(c=i&&i.getFullYear()===a,o=s&&s.getFullYear()===a,y+="<select class='ui-datepicker-month' data-handler='selectMonth' data-event='change'>",l=0;l<12;l++)(!c||l>=i.getMonth())&&(!o||l<=s.getMonth())&&(y+="<option value='"+l+"'"+(l===t?" selected='selected'":"")+">"+d[l]+"</option>");y+="</select>"}if(D||(m+=y+(!r&&f&&k?"":"&#xa0;")),!e.yearshtml)if(e.yearshtml="",r||!k)m+="<span class='ui-datepicker-year'>"+a+"</span>";else{for(h=this._get(e,"yearRange").split(":"),u=(new Date).getFullYear(),g=(p=function(e){var t=e.match(/c[+\-].*/)?a+parseInt(e.substring(1),10):e.match(/[+\-].*/)?u+parseInt(e,10):parseInt(e,10);return isNaN(t)?u:t})(h[0]),_=Math.max(g,p(h[1]||"")),g=i?Math.max(g,i.getFullYear()):g,_=s?Math.min(_,s.getFullYear()):_,e.yearshtml+="<select class='ui-datepicker-year' data-handler='selectYear' data-event='change'>";g<=_;g++)e.yearshtml+="<option value='"+g+"'"+(g===a?" selected='selected'":"")+">"+g+"</option>";e.yearshtml+="</select>",m+=e.yearshtml,e.yearshtml=null}return m+=this._get(e,"yearSuffix"),D&&(m+=(!r&&f&&k?"":"&#xa0;")+y),m+="</div>"},_adjustInstDate:function(e,t,a){var i=e.drawYear+("Y"===a?t:0),s=e.drawMonth+("M"===a?t:0),r=Math.min(e.selectedDay,this._getDaysInMonth(i,s))+("D"===a?t:0),n=this._restrictMinMax(e,this._daylightSavingAdjust(new Date(i,s,r)));e.selectedDay=n.getDate(),e.drawMonth=e.selectedMonth=n.getMonth(),e.drawYear=e.selectedYear=n.getFullYear(),"M"!==a&&"Y"!==a||this._notifyChange(e)},_restrictMinMax:function(e,t){var a=this._getMinMaxDate(e,"min"),i=this._getMinMaxDate(e,"max"),s=a&&t<a?a:t;return i&&i<s?i:s},_notifyChange:function(e){var t=this._get(e,"onChangeMonthYear");t&&t.apply(e.input?e.input[0]:null,[e.selectedYear,e.selectedMonth+1,e])},_getNumberOfMonths:function(e){var t=this._get(e,"numberOfMonths");return null==t?[1,1]:"number"==typeof t?[1,t]:t},_getMinMaxDate:function(e,t){return this._determineDate(e,this._get(e,t+"Date"),null)},_getDaysInMonth:function(e,t){return 32-this._daylightSavingAdjust(new Date(e,t,32)).getDate()},_getFirstDayOfMonth:function(e,t){return new Date(e,t,1).getDay()},_canAdjustMonth:function(e,t,a,i){var s=this._getNumberOfMonths(e),r=this._daylightSavingAdjust(new Date(a,i+(t<0?t:s[0]*s[1]),1));return t<0&&r.setDate(this._getDaysInMonth(r.getFullYear(),r.getMonth())),this._isInRange(e,r)},_isInRange:function(e,t){var a,i,s=this._getMinMaxDate(e,"min"),r=this._getMinMaxDate(e,"max"),n=null,d=null,c=this._get(e,"yearRange");return c&&(a=c.split(":"),i=(new Date).getFullYear(),n=parseInt(a[0],10),d=parseInt(a[1],10),a[0].match(/[+\-].*/)&&(n+=i),a[1].match(/[+\-].*/)&&(d+=i)),(!s||t.getTime()>=s.getTime())&&(!r||t.getTime()<=r.getTime())&&(!n||t.getFullYear()>=n)&&(!d||t.getFullYear()<=d)},_getFormatConfig:function(e){var t=this._get(e,"shortYearCutoff");return{shortYearCutoff:t="string"!=typeof t?t:(new Date).getFullYear()%100+parseInt(t,10),dayNamesShort:this._get(e,"dayNamesShort"),dayNames:this._get(e,"dayNames"),monthNamesShort:this._get(e,"monthNamesShort"),monthNames:this._get(e,"monthNames")}},_formatDate:function(e,t,a,i){t||(e.currentDay=e.selectedDay,e.currentMonth=e.selectedMonth,e.currentYear=e.selectedYear);var s=t?"object"==typeof t?t:this._daylightSavingAdjust(new Date(i,a,t)):this._daylightSavingAdjust(new Date(e.currentYear,e.currentMonth,e.currentDay));return this.formatDate(this._get(e,"dateFormat"),s,this._getFormatConfig(e))}}),b.fn.datepicker=function(e){if(!this.length)return this;b.datepicker.initialized||(b(document).mousedown(b.datepicker._checkExternalClick),b.datepicker.initialized=!0),0===b("#"+b.datepicker._mainDivId).length&&b("body").append(b.datepicker.dpDiv);var t=Array.prototype.slice.call(arguments,1);return"string"!=typeof e||"isDisabled"!==e&&"getDate"!==e&&"widget"!==e?"option"===e&&2===arguments.length&&"string"==typeof arguments[1]?b.datepicker["_"+e+"Datepicker"].apply(b.datepicker,[this[0]].concat(t)):this.each(function(){"string"==typeof e?b.datepicker["_"+e+"Datepicker"].apply(b.datepicker,[this].concat(t)):b.datepicker._attachDatepicker(this,e)}):b.datepicker["_"+e+"Datepicker"].apply(b.datepicker,[this[0]].concat(t))},b.datepicker=new e,b.datepicker.initialized=!1,b.datepicker.uuid=(new Date).getTime(),b.datepicker.version="1.11.4",b.datepicker});;
jQuery( function ( $ ) {
	$( '.contact-form input.jp-contact-form-date' ).datepicker();
} );
;
