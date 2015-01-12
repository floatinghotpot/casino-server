var hotjs = hotjs || {};

hotjs.i18n = {

	defaultLang : 'en',
	cookievalid : 86400000, //1 day (1000*60*60*24)
	text : {},

	put: function(lang, text) {
		if( this.text[ lang ] === undefined ) {
			this.text[ lang ] = {};
		}
		var L = this.text[ lang ];
		for( var k in text ) {
			L[k] = text[k];
		}
		return this;
	},
	extractLang : function(kvl) {
		var lang = 'en';
		for ( var i in kvl) {
			var kv = kvl[i].split('=');
			if (kv[0] === 'lang')
				lang = kv[1].length > 2 ? (kv[1].charAt(0) + kv[1].charAt(1)) : kv[1];
		}
		return lang;
	},
	getUrlLang : function() {
		if (window.location.search.length < 2)
			return undefined;
		return this.extractLang(window.location.search.substring(1).split('&'));
	},
	getCookieLang : function() {
		return this.extractLang(document.cookie.split('; '));
	},
	detectLang : function() {
		if (typeof (this.lang = this.getUrlLang()) === 'string')
			;
		else if (typeof (this.lang = this.getCookieLang()) === 'string')
			;
		else if (typeof (this.lang = navigator.language) === 'string')
			;
		else if (typeof (this.lang = navigator.userLanguage) === 'string')
			;
		else
			this.lang = this.defaultLang;
		
		if (this.lang.length > 2)
			this.lang = this.lang.charAt(0) + this.lang.charAt(1);
		
		return this;
	},
	getLang : function() {
		if (typeof this.lang !== 'string') {
			this.detectLang();
		}
		return this.lang;
	},
	setLang : function(lang, cook) {
		this.lang = lang;
		if (cook) {
			var wl = window.location, now = new Date();
			now.setTime( now.getTime() + this.cookievalid );
			document.cookie = 'lang=' + lang + ';path=' + wl.pathname + ';domain=' + wl.host + ';expires=' + now.toGMTString();
		}
		return this;
	},
	get : function(key) {
		var keys = key.split('.'), lang = this.getLang(), obj = this.text[lang];
		while (typeof obj !== 'undefined' && keys.length > 0)
			obj = obj[keys.shift()];
		return (typeof obj === 'undefined') ? key : obj;
	},
	t1 : function(item) {
		if (typeof item === 'object' && item instanceof Element) {
			var it = $(item), key = it.attr('i18n');
			it.removeClass('I18N');
			if (typeof key === 'undefined')
				key = it.text();
			var langText = this.get(key);
			it.attr('i18n', key).text( langText );
		}
		return this;
	},
	translate : function(item) {
		//alert( JSON.stringify( this.text[this.getLang()] ) );
		var lang = this.getLang();
		if (typeof this.text[ lang ] === 'undefined') {
			this.lang = this.defaultLang;
		}
		if (typeof item === 'undefined') {
			item = $('[I18N]');
			$('.I18N').each(function() {
				if (!$.contains(item, this))
					item = item.add(this);
			});
		}
		if (item instanceof jQuery)
			for ( var i in item)
				this.t1(item[i]);
		else
			this.t1(item);
		return this;
	}

};

window._T = function(key) {
	return hotjs.i18n.get(key);
};

window._T_ = function(key) {
	return ' ' + hotjs.i18n.get(key) + ' ';
};
