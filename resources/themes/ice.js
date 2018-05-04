
const $_documentContainer = document.createElement('div');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Ubuntu|Exo+2|Oxygen:700|Open+Sans" />
<dom-module id="i18n-style">
<template>
<style include="iron-flex iron-flex-alignment">
/*
 * PolymerThemes v1.0.3
 * Homepage: https://polymerthemes.com
 * Copyright 2015 Polymer Themes
 * Licensed under BSD
 * Based on Polymer: http://www.polymer-project.org/
 * Compatible with Polymer 1.0
 */

@import url("https://fonts.googleapis.com/css?family=Oxygen:700|Open+Sans");
html { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; font-size: 16px; }

html, body { margin: 0px; padding: 0px; min-height: 100%; color: #2d2d2d; background-color:rgba(255,255,255,0.01); font-family: 'Ubuntu', sans-serif; font-weight: 400; }
body>*{background-color:#FFFFFF}
body{border-radius:10px;border:1px solid #DDD}
section { padding: 40px 0px; }
section[hero] { background-color: #f3f3f3; }

h1, h2, h3, h4, h5, h6,
::content h1,::content h2,::content h3,::content h4,::content h5,::content h6{ font-weight: 400; margin: 0px; padding: 0px; line-height: 1em; }

h1, h3, h5,
::content h1, ::content h3, ::content h5{ font-family: 'Open Sans', sans-serif; }

h1 { font-size: 50px; margin: 30px 0px; }

h2 { color: #777777; font-size: 35px; margin: 20px 0px; }

h3 { font-size: 25px; margin: 15px 0px; }

h4 { font-size: 20px; }

a, a:active, a:visited, a:focus { color: #777777; text-decoration: none; }

a:hover { color: #777777; text-decoration: underline; }

:root {
	--default-primary-color: #446e9b; --dark-primary-color: #e7e7e7; --light-primary-color: #c5cae9;
	--text-primary-color: #ffffff; --accent-color: #ff4081; --primary-background-color: #ffffff;
	--primary-text-color: #2d2d2d; --secondary-text-color: #777777; --disabled-text-color: #313238;
	--divider-color: #e0e0e0; --paper-checkbox-checked-color: #446e9b;
	--paper-checkbox-checked-ink-color: #446e9b; --paper-checkbox-unchecked-color: #777777;
	--paper-checkbox-unchecked-ink-color: #777777; --paper-checkbox-label-color: #2d2d2d;
	--paper-fab-background: #446e9b; --paper-fab-disabled-background: #afb1b9;
	--paper-fab-disabled-text: #313238; --paper-icon-button-disabled-text: #afb1b9;
	--paper-input-container-color: #7a7a7a; --paper-input-container-focus-color: #446e9b;
	--paper-input-container-invalid-color: #ff6e40; --paper-input-container-input-color: #7a7a7a;
	--paper-menu-background-color: #f3f3f3; --paper-menu-color: #2d2d2d; --paper-menu-disabled-color: #afb1b9;
	--paper-progress-active-color: #446e9b; --paper-progress-secondary-color: #80cbc4;
	--paper-radio-button-checked-color: #446e9b; --paper-radio-button-checked-ink-color: white;
	--paper-radio-button-unchecked-color: #2d2d2d; --paper-radio-button-unchecked-ink-color: #2d2d2d;
	--paper-radio-button-label-color: #2d2d2d; --paper-slider-knob-color: #446e9b;
	--paper-slider-active-color: #446e9b; --paper-slider-pin-color: #446e9b;
	--paper-spinner-layer-1-color: #446e9b; --paper-spinner-layer-2-color: #446e9b;
	--paper-spinner-layer-3-color: #446e9b; --paper-spinner-layer-4-color: #446e9b;
	--paper-tabs-selection-bar-color:#231f20; --paper-tab-ink: #80cbc4;
	--paper-toggle-button-checked-bar-color: #446e9b; --paper-toggle-button-checked-button-color: #446e9b;
	--paper-toggle-button-checked-ink-color: #446e9b; --paper-toggle-button-unchecked-bar-color: #777777;
	--paper-toggle-button-unchecked-button-color: white; --paper-toggle-button-unchecked-ink-color: white;
	--paper-toolbar-background: #e7e7e7; --paper-toolbar-color: #FFF;
	--paper-icon-button:{
		width:20px;
		height:20px;
		padding:2px;
	}
	--fabric-toolbar:{
		height:25px;
		padding: 0 5px;
		-webkit-app-region:drag;
		cursor:move;
		user-select:none;
		border-top-right-radius: 10px;
    	border-top-left-radius: 10px;
    	background-color: #eee;
	}
	--app-header{
		border-top-right-radius: 10px;
    	border-top-left-radius: 10px;
	}
}

app-header{
	top:1px;
}
app-drawer{left:1px;bottom:1px !important;border-bottom-left-radius: 10px;overflow:hidden}

paper-toolbar a, paper-toolbar a:hover, paper-toolbar a:active, paper-toolbar a:visited, paper-toolbar a:focus { color: #777777; }

paper-button.primary, paper-button.btn-primary, paper-button[primary] { color: #446e9b; }
paper-button.primary[raised], paper-button.btn-primary[raised], paper-button[primary][raised] { background-color: #446e9b; color: #fff; }
paper-button.secondary, paper-button.btn-secondary, paper-button[secondary] { color: #80cbc4; }
paper-button.secondary[raised], paper-button.btn-secondary[raised], paper-button[secondary][raised] { background-color: #80cbc4; color: #263d3b; }
paper-button.success, paper-button.btn-success, paper-button[success] { color: #9dc56e; }
paper-button.success[raised], paper-button.btn-success[raised], paper-button[success][raised] { background-color: #9dc56e; color: #2f3b21; }
paper-button.info, paper-button.btn-info, paper-button[info] { color: #ffb74d; }
paper-button.info[raised], paper-button.btn-info[raised], paper-button[info][raised] { background-color: #ffb74d; color: #4d3717; }
paper-button.warning, paper-button.btn-warning, paper-button[warning] { color: #fadd60; }
paper-button.warning[raised], paper-button.btn-warning[raised], paper-button[warning][raised] { background-color: #fadd60; color: #4b421d; }
paper-button.error, paper-button.btn-error, paper-button[error] { color: #ff6e40; }
paper-button.error[raised], paper-button.btn-error[raised], paper-button[error][raised] { background-color: #ff6e40; color: #4d2113; }
paper-button.link, paper-button.btn-link, paper-button[link] { text-decoration: underline; }
paper-button[raised] { color: #2d2d2d; }
paper-button[disabled] { color: #313238 !important; background: #afb1b9 !important; }

paper-icon-button.primary, paper-icon-button.btn-primary, paper-icon-button[primary] { color: #446e9b; }
paper-icon-button.primary:hover, paper-icon-button.btn-primary:hover, paper-icon-button[primary]:hover { background-color: #ecf1f5; background-color: rgba(68, 110, 155, 0.2); border-radius: 50%; }
paper-icon-button.secondary, paper-icon-button.btn-secondary, paper-icon-button[secondary] { color: #80cbc4; }
paper-icon-button.secondary:hover, paper-icon-button.btn-secondary:hover, paper-icon-button[secondary]:hover { background-color: #f2faf9; background-color: rgba(128, 203, 196, 0.2); border-radius: 50%; }
paper-icon-button.success, paper-icon-button.btn-success, paper-icon-button[success] { color: #9dc56e; }
paper-icon-button.success:hover, paper-icon-button.btn-success:hover, paper-icon-button[success]:hover { background-color: #f5f9f1; background-color: rgba(157, 197, 110, 0.2); border-radius: 50%; }
paper-icon-button.info, paper-icon-button.btn-info, paper-icon-button[info] { color: #ffb74d; }
paper-icon-button.info:hover, paper-icon-button.btn-info:hover, paper-icon-button[info]:hover { background-color: #fff8ed; background-color: rgba(255, 183, 77, 0.2); border-radius: 50%; }
paper-icon-button.warning, paper-icon-button.btn-warning, paper-icon-button[warning] { color: #fadd60; }
paper-icon-button.warning:hover, paper-icon-button.btn-warning:hover, paper-icon-button[warning]:hover { background-color: #fffcef; background-color: rgba(250, 221, 96, 0.2); border-radius: 50%; }
paper-icon-button.error, paper-icon-button.btn-error, paper-icon-button[error] { color: #ff6e40; }
paper-icon-button.error:hover, paper-icon-button.btn-error:hover, paper-icon-button[error]:hover { background-color: #fff1ec; background-color: rgba(255, 110, 64, 0.2); border-radius: 50%; }


paper-icon-button{
	--iron-icon:{
		display:block
	}
}
paper-checkbox #checkmark.paper-checkbox, paper-checkbox /deep/, paper-checkbox::shadow #checkmark.paper-checkbox { border-color: #fff !important; }

paper-dialog { color: #2d2d2d; background-color: #ffffff; font-family: 'Oxygen', sans-serif; font-weight: 400; }
paper-dialog h1, paper-dialog h2, paper-dialog h3, paper-dialog h4, paper-dialog h5, paper-dialog h6 { overflow: visible; padding: 0 1em; text-align: center; }

paper-fab { --text-primary-color: white; }

paper-fab { background-color: #446e9b; color: #fff; --paper-fab-keyboard-focus-background: #1d2f42; }
paper-fab.primary, paper-fab.btn-primary, paper-fab[primary] { background-color: #446e9b; color: #fff; --paper-fab-keyboard-focus-background: #1d2f42; }
paper-fab.secondary, paper-fab.btn-secondary, paper-fab[secondary] { background-color: #80cbc4; color: #263d3b; --paper-fab-keyboard-focus-background: #3b9088; }
paper-fab.success, paper-fab.btn-success, paper-fab[success] { background-color: #9dc56e; color: #2f3b21; --paper-fab-keyboard-focus-background: #5d8033; }
paper-fab.info, paper-fab.btn-info, paper-fab[info] { background-color: #ffb74d; color: #4d3717; --paper-fab-keyboard-focus-background: #cd7a00; }
paper-fab.warning, paper-fab.btn-warning, paper-fab[warning] { background-color: #fadd60; color: #4b421d; --paper-fab-keyboard-focus-background: #d4ad07; }
paper-fab.error, paper-fab.btn-error, paper-fab[error] { background-color: #ff6e40; color: #4d2113; --paper-fab-keyboard-focus-background: #c02e00; }
paper-fab[disabled] { color: #313238 !important; background: #afb1b9 !important; }

section.hero paper-menu, section[hero] paper-menu { --paper-menu-background-color: #f3f3f3; }

paper-tabs { background-color:transparent; color:#606060; }

paper-toolbar paper-input,
.header paper-input{
    --paper-input-container-color:#FFF;
    --paper-input-container-focus-color: #FFF;
    --paper-input-container-invalid-color: #FFF;
    --paper-input-container-input-color: #FFF;
}

paper-toolbar paper-input,
.header paper-input{
	--paper-input-container:{
		padding-top:0px;padding-bottom:0px;
	}
}

::content .header h1,.header h1,h1.header{margin-left:10px;margin-right:10px;font-size:25px;}
::content .header paper-icon-button[sort-dir] iron-icon{transition:all 0.2s ease; transform:rotateY(180deg);}
::content .header paper-icon-button[sort-dir="ASC"] iron-icon{transform:rotateZ(180deg);}
::content .header{-ms-flex-pack: center;-webkit-justify-content: center;justify-content: center;-ms-flex-align: center;
        -webkit-align-items: center;align-items: center;}

@media(max-width:500px){
	paper-header-panel paper-toolbar::shadow #topBar{padding-left:5px;padding-right:5px;}
	paper-header-panel paper-toolbar::shadow .toolbar-tools.paper-toolbar  paper-icon-button[icon=menu]{margin-right:0px}
}


paper-tab:focus::shadow .tab-content{font-weight:500 !important;}

</style>
</template>
</dom-module>
`;

document.body.appendChild($_documentContainer);