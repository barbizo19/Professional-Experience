class processJSON extends superConsole {  // Registers and process new updates for the json
  constructor() {
    super();
    this.paths = [];        // Paths is an array of dot/bracket notated paths that define a path to a json value that is potentially changed
  }

  init() {
    super.init();
  }

  processJSON(category = null, value = null, info = { silent: false, force: false }) {
    var newJSON = {
      status: {}
    }

    if (info.index != null) {                                                                       // If the "json.status[category]" is an array we will need to find the correct object in the category array to update by name
      if (json.status[category] == undefined && json.status[category][info.index] == undefined) {   // Does the array and object in the array exist?
        this.console.error("Cannot find index:", info.index, "in array", category);                 // Report the error
        return null;                                                                                // Do not continue
      }
      if (newJSON.status[category] == undefined) newJSON.status[category] = [];                     // If for some rason the category does not exist yet, add it to the json.status
      newJSON.status[category][info.index] = value;                                                 // Update the correct item in the category array
    } else newJSON.status[category] = value;                                                        // Else if the "json.status[category]" is not an array --> Update the item using bracket notation directly

    // Runs for Loop with results
    // Checks string path using switch case statement
    if (!info.force) this.paths = objectPathDifferences(newJSON.status, json.status);               // Compares global "json" object values to the njson values and checks if the each value is different, if a value is different the path is included in the return
    else this.paths = objectPaths(newJSON.status);                                                  // Just get the paths for all properties in the newJSON.status because we are forcing processJSON to eval all properties weather there is a difference or not.
    this.console.log("paths:", this.paths);                                                         // Paths of values differing from the global "json" obj compared to the local newJSON obj
    this.console.log("newJSON:", newJSON);                                                          // Object containing the new json values to be used to update the global "json" obj

    for (var i=0; i<this.paths.length; i++) {                                                       // Loop through each of the paths in the this.paths to apply it to the json and potentially perform some other actions
      eval("json.status" + this.paths[i] + "=" + "newJSON.status" + this.paths[i]);                 // Apply the value change to the json
      if (info.silent == null || info.silent == false) {                                            // Silent mode enabled will prevent switch case statements from running that effect other classes
        switch (this.paths[i]) {                                                                    // Use the path to determin what further actions to complete if any
          case ".weather": {                                                                        // Change the weather widget mode
            weatherWidgetObj.changeMode(json.status.weather);                                       // Apply weather mode change to weather widget
            break; }
          case ".voice": {                                                                          // Enable/Disable the voice control listening
            this.console.log("VOICE CHANGE:", json.status.voice);                                   // Apply the change to the voice class
            break; }
          case ".SAP": {                                                                            // Enable/Disable the SAP channel of the TV
            this.console.log("SAP CHANGE:", json.status.SAP);                                       // Apply the change to the triplePlay class
            break; }
          case ".channel.URL": {
            displayObj.manageVideo("TV", json.status.channel.URL);                                  // Display Class will decide what source to play from and what to play;
            break; }
          case ".internalSpeakers": {                                                               // When there is a change the selected speaker output external/internal
            if (!json.status.internalSpeakers) {
              TVControlObj.queueTVCommand("speaker", 1);                                            // Make sure the TV is in external speaker select mode before changing volume
              json.status.volume.output = "external";                                               // Force the output into external
            } else if (json.status.internalSpeakers && json.status.volume.internal > 0) {
              TVControlObj.queueTVCommand("speaker", 0);                                            // Make sure the TV is in internal speaker select mode before changing volume
              json.status.volume.output = "internal";                                               // Force the output into internal
            }
            break; }
          case ".volume.output": {                                                                        // When there is a change the selected speaker output external/internal
            if (json.status.volume.output == "internal") TVControlObj.queueTVCommand("speaker", 0);       // Apply the speaker select change in the samsung TV
            else if (json.status.volume.output == "external") TVControlObj.queueTVCommand("speaker", 1);  // Apply the speaker select change in the samsung TV
            break; }
          case ".volume.external":
          case ".volume.internal": {                                                              // When there is a change in volume external/internal level (0-100) and/or mute (boolean)
            TVControlObj.queueTVCommand("volume", json.status.volume[json.status.volume.output]); // Apply the volume change in the samsung TV
            break; }
          case ".volume.mute": {                                                                 // When there is a change in volume external/internal level (0-100) and/or mute (boolean)
            TVControlObj.queueTVCommand("mute", Number(json.status.volume.mute));                // Apply the mute change in the samsung TV
            break; }
          case ".samsungSource": {                                                            // When there is a change in samsung HDMI source (1 or 2) for HDMI 1, HDMI 2
            TVControlObj.queueTVCommand("hdmi", json.status.samsungSource);                   // Applying the change to the HDMI source in the samsungTV source
            break; }
          case ".controlState": {                                                             // Called to change a control state from one state to another.
            this.console.log("%cchangeState:%c from %c" + info.from + "%c to " + "%c" + value, consoleCSS[1], consoleCSS.b, consoleCSS[2], consoleCSS.b, consoleCSS[3]);
            
            if (info.from == null && info.from != "startup") {                                // If the info.from is not specified, then get the active state
              for (var stateObject in PO) {                                                   // Loop through all the control states
                if (PO[stateObject].getState()) {                                             // Find the active state
                  info.from = PO[stateObject].getName();                                      // Get its name
                  break;                                                                      // Stop Looping through all the states
                }
              }
            }
          
            if (info.from != "startup") PO[info.from + "Obj"].deactivateState(info.info);     // Deactivate the from state
            SEET.breakEvent();                                                                // Stop current event from continuing send out to more control states since we are done with the current controlstate
            PO[value + "Obj"].activateState(info.source, info.cmd, info.value, info.info);    // Activate the target state
            break; }
          case ".displayState": {                                                             // When there is a change in the display state (the application layout)
            switch (json.status.displayState) {                                               // Use the new display state to determine what further specific actions to take
              case "offState": {                                                              // "offState" has the video in the upper left corner powered off, the weather/logo display and the digital whiteboard displayed with a backlight of ON
                channelManagerObj.setDefaultChannelTimeout();
                TVControlObj.queueTVCommand("lamp", settings.backlightOn);                    // Change the backlight to the ON setting from the settings sever
                displayObj.render(json.status.displayState);                                  // Apply the changes to the layout of the Device application
                if (json.status.lastDisplayState == "eLertState") displayObj.resetTVAudio();
                displayObj.manageVideo("TV", null);
                displayObj.manageVideo("eLert", null);
                json.status.lastDisplayState = json.status.displayState;
                if (json.status.natusState) {
                  // If natusState is true then reset the speaker state, clear natusTimeout and set natusState to false 
                  if (ibiObj.resetSpeakerState(ibiObj.speakerState, ibiObj.info)) {
                    clearTimeout(ibiObj.natusTimeout);
                    json.status.natusState = false;
                  }
                }
                break; }
              case "comboState":                                                              // "comboState" has the video in the upper left corner, the weather/logo display and the digital whiteboard displayed with a backlight of ON
              case "fullscreenState": {                                                       // "fullscreenState" has the video HTML element full screen and hides all other layout areas
                TVControlObj.queueTVCommand("lamp", settings.backlightOn);                    // Change the backlight to the ON setting from the settings sever
                displayObj.render(json.status.displayState);                                  // Apply the changes to the layout of the Device application

                if (json.status.lastDisplayState == "eLertState") displayObj.resetTVAudio();
                else if (["offState", "nightState", "sleepState"].includes(json.status.lastDisplayState)) {
                  channelManagerObj.clearDefaultChannelTimeout();
                  displayObj.manageVideo("TV", json.status.channel.URL);
                  if (settings.extronActive) json.status.extronSource = "STB";
                  if (extronObj != undefined) extronObj.changeHDMI("STB");                    // If there is an extron switch it to STB
                  displayObj.manageVideo("eLert", null);
                }
                json.status.lastDisplayState = json.status.displayState;

                // Randall moved the following three statements out of the else that is below. The issue is that these statements weren't executing when returning to comboState from eLert
                this.console.log("TVControl: TVoutput, volume, mute", (json.status.volume.output == "internal") ? 0 : 1, json.status.volume[json.status.volume.output], Number(json.status.volume.mute));
                TVControlObj.queueTVCommand("speaker", (json.status.volume.output == "internal") ? 0 : 1);  // Apply the speaker select change in the samsung TV
                TVControlObj.queueTVCommand("volume", json.status.volume[json.status.volume.output]);       // Apply the volume change in the samsung TV
                TVControlObj.queueTVCommand("mute", Number(json.status.volume.mute));                       // Apply the mute change in the samsung TV

                break; }
              case "nightState": {                                                            // "nightState" has the video and weather/logo section hidden and just displays the Digital Whiteboard with the backlight in the "nightState" setting
                channelManagerObj.setDefaultChannelTimeout();
                TVControlObj.queueTVCommand("lamp", settings.backlightNight);                 // Change the backlight to the "nightState" setting from the settings sever
                displayObj.render(json.status.displayState);                                  // Apply the changes to the layout of the Device application
                if (json.status.lastDisplayState == "eLertState") displayObj.resetTVAudio();
                displayObj.manageVideo("TV", null);
                displayObj.manageVideo("eLert", null);
                json.status.lastDisplayState = json.status.displayState;
                break; }
              case "sleepState": {                                                            // "sleepState" has the entire app hidden with the backlight at 0
                channelManagerObj.setDefaultChannelTimeout();
                if (json.status.controlState != "controlWidgetStateSleepMenu") TVControlObj.queueTVCommand("lamp", settings.backlightOff);  // Specific code related to CCH build that prevents the backlight from being set until the sleepMenu in the CCH build timesout
                displayObj.render(json.status.displayState);                                  // Apply the changes to the layout of the Device application
                if (json.status.lastDisplayState == "eLertState") displayObj.resetTVAudio();
                displayObj.manageVideo("TV", null);
                displayObj.manageVideo("eLert", null);
                json.status.lastDisplayState = json.status.displayState;
                break; }
              case "eLertState": {                                                            // "eLertState" is used during emergencies to video conference with the patient and/or family 
                if (json.status.controlState != "controlStateBase") this.processJSON("controlState", "controlStateBase", { from: null }); // Forces the controlState to change
                TVControlObj.queueTVCommand("lamp", settings.backlightOn);                    // Change the backlight to the ON setting from the settings sever
                displayObj.render("eLertState");                                              // Put the device layout into eLert mode
                displayObj.manageVideo("TV", "HDMI"); 
  
                if (settings.elertBellActive) displayObj.manageVideo("eLert", "../commonAppAssets/mainlineCode/assets/BellVideoShort.mov");       // Elert state with bell: Turn off the entertainementVideo while the elertBell plays. (Media end event will fire at conclusion of elertBell video)
                else displayObj.manageVideo("eLert", null);
  
                if (json.status.volume.output == "internal") TVControlObj.queueTVCommand("speaker", 1);                                                                  // Apply the speaker select change in the samsung TV
                TVControlObj.queueTVCommand("volume", settings.externalVolumeMaximum);
                // displayObj.mute("TV", false);  // ?? VIDEO TAG MUTE
                TVControlObj.queueTVCommand("mute", Number(false));                           // Apply the mute change in the samsung TV
                break; }
            }
            break; }
          case ".shades[" + info.index + "].name": {
            var controller = PO["controlWidgetStateShade" + info.index + "Obj"];              // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("name");  // Update the controller when message from EBO is recieved
            break; }
          case ".shades[" + info.index + "].value": {
            var controller = PO["controlWidgetStateShade" + info.index + "Obj"];              // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("value"); // Update the controller when message from EBO is recieved
            else if (settings.EBOActive) {                                                    // Update EBO
              EBOObj.updateEBO({
                [category]: [{
                  name: json.status[category][info.index].name,
                  value: json.status[category][info.index].value
                }]
              });  
            }
            break; }  
          case ".privacyGlass[" + info.index + "].name": {
            var controller = PO["controlWidgetStatePrivacyGlass" + info.index + "Obj"];       // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("name");  // Update the controller when message from EBO is recieved
            break; }
          case ".privacyGlass[" + info.index + "].value": {
            var controller = PO["controlWidgetStatePrivacyGlass" + info.index + "Obj"];       // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("value"); // Update the controller when message from EBO is recieved
            else if (settings.EBOActive) {                                                    // Update EBO
              EBOObj.updateEBO({
                [category]: [{
                  name: json.status[category][info.index].name,
                  value: json.status[category][info.index].value
                }]
              });  
            } 
            break; }
          case ".thermostats[" + info.index + "].name": {
            var controller = PO["controlWidgetStateThermostat" + info.index + "Obj"];            // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("name");     // Update the controller when message from EBO is recieved
            break; }
          case ".thermostats[" + info.index + "].setPoint": {
            var controller = PO["controlWidgetStateThermostat" + info.index + "Obj"];            // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("setPoint"); // Update the controller when message from EBO is recieved
            else if (settings.EBOActive) {                                                       // Update EBO
              EBOObj.updateEBO({
                [category]: [{
                  name: json.status[category][info.index].name,
                  setPoint: json.status[category][info.index].setPoint
                }]
              });
            }
            break; }
          case ".thermostats[" + info.index + "].rangeHigh": {
            var controller = PO["controlWidgetStateThermostat" + info.index + "Obj"];              // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("rangeHigh");  // Update the controller when message from EBO is recieved
            break; }
          case ".thermostats[" + info.index + "].rangeLow": {
            var controller = PO["controlWidgetStateThermostat" + info.index + "Obj"];              // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("rangeLow");   // Update the controller when message from EBO is recieved
            break; }
          case ".lighting[" + info.index + "].name": {
            var controller = PO["controlWidgetStateLight" + info.index + "Obj"];                   // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("name");       // Update the controller when message from EBO is recieved
            break; }
          case ".lighting[" + info.index + "].value": {
            var controller = PO["controlWidgetStateLight" + info.index + "Obj"];                   // Get a reference to the controller
            if (info.type == "update" && controller != undefined) controller.update("value");      // Update the controller when message from EBO is recieved
            else if (settings.EBOActive) {                                                         // Update EBO
              EBOObj.updateEBO({
                [category]: [{
                  name: json.status[category][info.index].name,
                  value: json.status[category][info.index].value
                }]
              });  
            }
            break; }
          case ".lighting[" + info.index + "].isDimming": {
            var controller = PO["controlWidgetStateLight" + info.index + "Obj"];                   // Get a reference to the controller
            if (info.type == "update" && controller) controller.update("isDimming");               // Update the controller when message from EBO is recieved
            break; }
        }
      }
    } 
    
    if (this.paths.length > 0) {                                      // If there are any paths in the this.paths after finishing for loop lets broadcast all the changes by sending the current copy of the json into the websockets wsBroadcast() method
      if (wsSocketObj != undefined) wsSocketObj.wsBroadcast();        // Triggering broadcast and the IBI_IO will curate the updates that need to be broadcasted out to different client types
      this.paths = [];                                                // Reseting the paths array
    }
  }

  resetJSON(type, category, property = null) {                        // Reset the JSON Obj, Array, or property before defining a new one using processJSON this allows for an entire object to be reset when one or more properties need to be removed entirely
    switch (type) {
      case "object": {                                                // Reset an object
        if (property == null) json.status[category] = {};
        else json.status[category][property] = {};
        break; }
      case "array": {                                                 // Reset an array
        if (property == null) json.status[category] = [];
        else json.status[category][property] = [];
        break; }
      default: {                                                      // Reset a property
        if (property == null) json.status[category] = undefined;
        else json.status[category][property] = undefined;
        break; }
    }
  }
}