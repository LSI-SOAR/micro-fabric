var _ = require('underscore');
var UUID = require('uuid');

var i18n = nw.Window.get().data.i18n;
var _T = i18n.getT();

//i18n.nodes.clear();
i18n.nodes.forEach(function(node, uuid, map) {
	if(node.window == window){
		i18n.nodes.delete(uuid);
	}
});
new (class i18n_global_updater_ {
	constructor() {
		this.uuid = UUID.v1();
		this.window = window;
		i18n.nodes.set(this.uuid, this);
	}

	onLocaleChanged() {
		var list = $("i18n,[i18n]");
		_.each(list, (e) => {
			e = $(e);
			var hash = e.attr("i18n-hash");
			if(!hash) {
				var text = e.html();
				hash = i18n.hash(text);
				text = i18n.translate(text);
				e.attr("i18n-hash", hash);
				e.html(text);
			}
			else {
				let o = i18n.entries.get(hash);
				if(!o)
					console.error(`i18n Error: no entry exists for hash ${hash}`)
				e.html(o.locale[i18n.locale] || o.locale[i18n.config.sourceLanguage]);
			}
		})
	}
})();
