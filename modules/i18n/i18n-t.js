import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-styles/default-theme.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';

const $_documentContainer = document.createElement('div');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `
<dom-module id="i18n-t">
    <template><slot id="content"></slot></template>
</dom-module>`;

document.body.appendChild($_documentContainer);


Polymer({
    is : "i18n-t",
    properties : {
        uuid : { type : String },
        hash : { type : String }, 
        html : { type : String } 
    },
    ready : function() {
        this.set("uuid", UUID.v1());
    },
    attached : function() {
        //console.dir(this)
        //console.dir(this.$.content.assignedNodes())
        //console.log("TEST:",this.$.content._distributedNodes[0].parentElement.innerHTML);

        this.target = this;//.$.content._distributedNodes[0].parentElement;

        //var text = _.map(this.$.content._distributedNodes, (e) => { return e; });

    
        //if(this.$.content._distributedNodes.length) {
            var text = this.target.innerHTML;//this.$.content._distributedNodes[0].parentElement.innerHTML;
            //console.log("TEXT:","'"+text+"'");

            //this.set("html",text);
            var hash = i18n.hash(text);
            this.set("hash", hash);
            text = i18n.translate(text);
            this.target.innerHTML = text;
        //}

        i18n.nodes.set(this.uuid, this);
    },
    onLocaleChanged:function(){
        if(!this.hash)
            return
        var e = i18n.entries.get(this.hash);                   
        this.target.innerHTML = e.locale[i18n.locale] || e.locale[i18n.config.sourceLanguage];
    },
    detached : function() {
        i18n.nodes.delete(this.uuid);
    }
})