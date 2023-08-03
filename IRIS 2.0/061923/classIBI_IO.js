class IBI_IO extends superConsole {
  constructor() {
    super();
    this.keyTranslate = [                                 // Defines key translations for easy code maintinance
      { code: "F8", translation: "Power" },
      { code: "Home", translation: "Guide" },
      { code: "ArrowUp", translation: "ArrowUp" },
      { code: "Escape", translation: "Info" },
      { code: "ArrowLeft", translation: "ArrowLeft" },
      { code: "Enter", translation: "Enter" },
      { code: "ArrowRight", translation: "ArrowRight" },
      { code: "KeyA", translation: "Last" },
      { code: "ArrowDown", translation: "ArrowDown" },
      { code: "KeyB", translation: "Mute" },
      { code: "F4", translation: "ChannelUp" },
      { code: "KeyC", translation: "ClosedCaptions" },
      { code: "F10", translation: "VolumeUp" },
      { code: "F3", translation: "ChannelDown" },
      { code: "KeyD", translation: "Display" },
      { code: "F9", translation: "VolumeDown" }
    ];

    this.wsJSONCompare = {};                              // Last json for post WS calls
    
    this.keyboardStatus = false;                          // Is the keyboard plugged into the USB-C port on the Device
    this.weatherTippingPoint = 2624;                      // Exact px size of weather/logo area where the weather gets rendered into a different layout (for use when using eLert bell video and sound)
    this.keyPressHistory = [];                            // History of the last 5 key presses from any owner (patient, username)

    this.samsungSourceSwitchDeviceID = null;              // DeviceID of the simulator that switched the sansungSource
    this.speakerState = {};                               // Object to capture the speaker state when a Natus event is triggered
    this.info = {};                                       // Info object to be passed into processJSON
    this.natusTimeout = null;                             // Timeout variable for the Natus timeouts
  }

  init() {
    super.init();
    wsSocketObj.init(                                       // Initialize websockets
      8080,                                                 // WebSockets server using port 8080
      [                                                     // List of allowed client types and number of them allowed, this helps the device determine white kind json gets broadcasted to the clients based on their type, also prevents just anyone from connecting or more than the quanitiy of an allowed client type from connecting
        { clientType: "codeboardClient", quantity: 1 },
        { clientType: "digitalWhiteboardClient", quantity: 1 },
        { clientType: "clinicalPCClient", quantity: 1 },
        { clientType: "simulatorClient", quantity: 2, ids: ["simulatorOne", "simulatorTwo"] }
      ]);                                                                    
    diagnosticsObj.enableBroadcast();                                                                                 // Enables the diagnosticsObj to call the websocketsObj to broadcast updates

    var KeyboardClass = require("@brightsign/keyboard");                                                              // Require a brightsign specific keyboard class
    keyboardObj = new KeyboardClass();                                                                                // Instantiate this brightsign specific keyboard class, used to determin if the keyboard is plugged in our not
    diagnosticsObj.update("IBIDevice", "USB", "Initialized", { message: "Initialized the IBI Device." });             // Report the initialization of the IBIDevice to the diagnosticsObj
    this.serialConnectedCheck();                                                                                      // Check if the keyboard is plugged in initially
    setInterval(() => { this.serialConnectedCheck(); }, 5000);                                                        // Check every 5 seconds if the keyboard is plugged in while the device app is running 

    window.addEventListener("keydown", (e) => {
      e.preventDefault();
      // this.console.log("keydown: (.key - "+e.key+") || keydown: (.keyCode - "+e.keyCode+") || keydown: (.code - "+e.code+") || keydown: (.charCode - "+e.charCode+") || keydown: (.which - "+e.which+") || keydown: (.keyIdentifier - "+e.keyIdentifier+")");
      var key;                                                                            // Key variable is 0-9 or a translated key value
      if (e.key >= 0 && e.key <= 9) key = e.key;                                          // If the key is 0-9 use the "e.key"
      else {                                                                              // Else of the key is any other key
        var translateObj = this.keyTranslate.find(x => x.code == e.code);           // Find the keys translate obj
        if (translateObj != undefined) key = translateObj.translation;                    // If the translate obj is found find the translation
        else {                                                                            // If the translate obj cannot be found, report this
          var error = "Cannot find key translation for key: " + e.code;
          diagnosticsObj.update("IBIDevice", "USB", "Error", { error: error });
          this.console.log(error);
        }
      }
      if (key != undefined) this.manageKeyPress({ cmd: key, source: "userPillowspeaker", owner: "patient", timestamp: Date.now(), type: "keyPress" }); // Save the key, send it over websockets, and dispatch event
      diagnosticsObj.update("IBIDevice", "USB", "Connected & Active", { message: "IBI Device is active." });
    });

    gpioObj = new GPIO();                                                                                       // Instantiating GPIO class for use in recognizing GPIO btns on the Environmental Buttons pillow speaker
    gpioObj.init(this.GPIOInitialization.bind(this));
    this.GPIOConnectedCheck();                                                                                  // Check to see if BOTH GPIO connectors are connected
    gpioObj.subscribeInputPin("up/down", 0, this.GPIOConnectedCheck.bind(this));                                // Called if left GPIO connector is disconnected or connected into the brightsign
    gpioObj.subscribeInputPin("up/down", 7, this.GPIOConnectedCheck.bind(this));                                // Called if right GPIO connector is disconnected or connected into the brightsign
    gpioObj.subscribeInputPin("up/down/hold", 1, (pin, type) => {
      var cmd = "Light0-" + type;
      this.manageKeyPress({ cmd: cmd, source: "userPillowspeaker", info: { index: 0 }, owner: "patient", timestamp: Date.now(), type: "keyPress" });  // Save the key, send it over websockets, and dispatch event
      diagnosticsObj.update("pillowSpeaker", "GPIO", "Connected & Active", { message: "Environmental Buttons Device is Initialized.", key: cmd });
    });
    gpioObj.subscribeInputPin("up/down/hold", 2, (pin, type) => {
      var cmd = "Light1-" + type;
      this.manageKeyPress({ cmd: cmd, source: "userPillowspeaker", info: { index: 1 }, owner: "patient", timestamp: Date.now(), type: "keyPress" });  // Save the key, send it over websockets, and dispatch event
      diagnosticsObj.update("pillowSpeaker", "GPIO", "Connected & Active", { message: "Environmental Buttons Device is Initialized.", key: cmd });
    });
    gpioObj.subscribeInputPin("down", 5, (e) => {
      var cmd = "Shade0";
      this.manageKeyPress({ cmd: cmd, source: "userPillowspeaker", info: { index: 0 }, owner: "patient", timestamp: Date.now(), type: "keyPress" });  // Save the key, send it over websockets, and dispatch event
      diagnosticsObj.update("pillowSpeaker", "GPIO", "Connected & Active", { message: "Environmental Buttons Device is Initialized.", key: cmd });
    });
    gpioObj.subscribeInputPin("down", 6, (e) => {
      var cmd = "PrivacyGlass0";
      this.manageKeyPress({ cmd: cmd, source: "userPillowspeaker", info: { index: 0 }, owner: "patient", timestamp: Date.now(), type: "keyPress" });  // Save the key, send it over websockets, and dispatch event
      diagnosticsObj.update("pillowSpeaker", "GPIO", "Connected & Active", { message: "Environmental Buttons Device is Initialized.", key: cmd });
    });
    gpioObj.subscribeInputPin("down", 4, async (e) => {
      this.console.log("Play NATUS Video");
      json.status.natusState = true;
        this.speakerState = {
          // Create a speakerState object that saves the current values of the volume object. This will be referenced when the Natus VOD ends
          "external": json.status.volume.external,
          "internal": json.status.volume.internal,
          "output": json.status.volume.output,
          "mute": json.status.volume.mute
        };

        this.info = {
          // Create the info options to be passed into processJSON
          silent: false,
          force: true
        };

        var natusVODDuration = ((settings.triplePlay.natusVODDuration * 1000) + 2000) || 59000;              // Determine the delay for resetting the speaker configuration

      if (settings.videoSources.triplePlay != undefined && settings.videoSources.triplePlay.enabled && settings.triplePlay.natusVODName != undefined) {
        if (settings.EBOActive) {
          EBOObj.updateEBO({                                                                                    // Update EBO
            lighting: [{
              name: json.status.lighting[1].name,
              value: 10
            }],
            privacyGlass: [{
              name: json.status.privacyGlass[0].name,
              value: 0
            }]
          }, { "cmdSeq": "natus" });

          if (settings.extronActive) await extronObj.changeHDMI("STB");                                                   // Change the HDMI to STB fro the triplePlay natus video to play.
          processJSONOBJ.processJSON("samsungSource", 1);                                                                 // Set the samsungSource to 1. (brightsign HDMI in on samsung)
          if (settings.triplePlay.natusVODDuration != undefined && settings.triplePlay.natusInternalVolume != undefined && settings.triplePlay.natusExternalVolume != undefined) {
            if(this.speakerState.output == "external") {
              // If the volume output = external when the Natus event was triggered, set the appropriate volume values for a Natus event. processJSON is called once because setting the output to internal achieves the desired Natus speaker configuration
              processJSONOBJ.processJSON("volume", {
                external: settings.triplePlay.natusExternalVolume || 100,
                output: "internal",
                internal: settings.triplePlay.natusInternalVolume || 35,
                mute: false
              });

              this.natusTimeout = setTimeout(() => {
                // Set a timeout with timer equal to Natus VOD duration +2 seconds to account for loading delay. Call resetSpeakerState and set the natusState to false when timer expires
                this.resetSpeakerState(this.speakerState, this.info);
                json.status.natusState = false;
              }, natusVODDuration);

            }

            else {
              // If the volume output = internal when the Natus event was triggered, set the appropriate volume values for a Natus event. processJSON is called once per speaker
              processJSONOBJ.processJSON("volume", {
                internal: settings.triplePlay.natusInternalVolume || 35,
                output: "external",
                external: settings.triplePlay.natusExternalVolume || 100,
              });

              processJSONOBJ.processJSON("volume", {
                output: "internal",
                mute: false
              });

              this.natusTimeout = setTimeout(() => {
                // Set a timeout with timer equal to Natus VOD duration +2 seconds to account for loading delay. Call resetSpeakerState and set the natusState to false when timer expires
                this.resetSpeakerState(this.speakerState, this.info);
                json.status.natusState = false;
              }, natusVODDuration);
            }
          }

          processJSONOBJ.processJSON("displayState", "comboState");                                             // Change over to comboState for video playback.
          processJSONOBJ.processJSON("lighting", { value: 10 }, { index: 1, type: "update" });                  // Dispatch to turn on the light 2 without opening the widget.
          processJSONOBJ.processJSON("privacyGlass", { value: 0 }, { index: 0, type: "update" });               // Dispatch to turn off privacy glass without opening the widget.
        }
        processJSONOBJ.processJSON("controlState", "controlStateBase", { from: null, source:"natusAlarm" });    // Return to base state
        channelManagerObj.command("natus");                                                                     // Tell the Channel Manager to play the Natus video asset
      }
    });
    
    // Widgets
    this.messagesWidgetObj = new messagesWidget(3);
    if (settings.voiceActive) this.voiceWidgetObj = new voiceWidget(3);
    if (settings.videoSources.triplePlay != undefined && settings.videoSources.triplePlay.enabled) this.mediaWidgetObj = new mediaWidget();
    if (settings.SAPActive) this.SAPWidgetObj = new SAPOptionsWidget();
    this.personnelWidgetObj = new personnelWidget();

    this.menuWidgetObj = new menuWidget();
    
    weatherWidgetObj = new weatherWidget();
    weatherWidgetObj.init(this.weatherTippingPoint);

    if (!settings.triplePlayCommandPassthru) this.channelSelectorWidget = new channelSelectorWidget();
    if (!settings.triplePlayCommandPassthru) this.channelEntryWidget = new channelEntryWidget();
    this.cornerTextWidget = new cornerTextWidget();
    this.volumeWidget = new volumeWidget();
    this.diagnosticsWidget = new diagnosticsWidget(document.body);

    // Control States
    PO.controlStateBaseObj = new controlStateBase();

    // Control Widget States
    if (settings.SAPActive) PO.controlWidgetStateSAPObj = new controlWidgetStateSAP(this.SAPWidgetObj);
    PO.controlWidgetStateMenuObj = new controlWidgetStateMenu(this.menuWidgetObj);
    PO.controlWidgetStateCornerTextObj = new controlWidgetStateCornerText(this.cornerTextWidget);
    PO.controlWidgetStateVolumeObj = new controlWidgetStateVolume(this.volumeWidget);
    if (settings.videoSources.triplePlay != undefined && settings.videoSources.triplePlay.enabled) PO.controlWidgetStateMediaObj = new controlWidgetStateMedia(this.mediaWidgetObj);

    if (!settings.triplePlayCommandPassthru) PO.controlWidgetStateChannelSelectorObj = new controlWidgetStateChannelSelector(this.channelSelectorWidget);
    if (!settings.triplePlayCommandPassthru) PO.controlWidgetStateChannelEntryObj = new controlWidgetStateChannelEntry(this.channelEntryWidget);
    PO.controlWidgetStateDiagnosticsObj = new controlWidgetStateDiagnostics(this.diagnosticsWidget);
    
    // ========================= Independent Control Widget States ========================= //
    IC.independentControlStateMessagesObj = new independentControlStateMessages(this.messagesWidgetObj);
    if (settings.voiceActive) IC.independentControlStateVoiceObj = new independentControlStateVoice(this.voiceWidgetObj);
    IC.independentControlStatePersonnelObj = new independentControlStatePersonnel(this.personnelWidgetObj);

    // Initialize all the objects
    for (var item in PO) PO[item].init();
    for (var item in IC) IC[item].init();
    
    processJSONOBJ.processJSON("displayState", json.status.displayState, { force: true });                                // Force processJSON to process this displayState regaurdless if its the same as what is already in the json.status
    processJSONOBJ.processJSON("controlState", json.status.controlState, { force: true, from: "startup" });               // Force processJSON to process the controlState change

    this.processDynamicWidgetsConfiguration(buildSettings.EBO.json);                                          // Applying the default settings to the json for EBO related objects
    if (settings.EBOActive) {                                                                                 // Checking if EBO is enabled
      EBOObj.getEBODevices();                                                                                 // Get JSON describing EBO controlled devices
    }
  }

  async processDynamicWidgetsConfiguration(ECOJSON) {
    var addOrRemove = false;
    var oldCounts = {};

    simulatorSettingsBuilderObj.update("ECOJSON", ECOJSON);

    for (const [category, objs] of Object.entries(ECOJSON)) {
      if (json.status[category] != undefined) {
        oldCounts[category] = json.status[category].length;
        if (oldCounts[category] != objs.length) {
          if (json.status.controlState != "controlStateBase") {
            processJSONOBJ.processJSON("controlState", "controlStateBase", { from: null });
            await wait(600);
          }
          processJSONOBJ.resetJSON("array", category);
          json.status[category] = objs;
          addOrRemove = true;
          this.manageDynamicWidgets(category, oldCounts[category], objs.length);
        }
        
        for (var i=0; i<objs.length; i++) processJSONOBJ.processJSON(category, objs[i], { index: i, type: "update" }); 
      } else {
        oldCounts[category] = 0;
        processJSONOBJ.resetJSON("array", category);
        json.status[category] = objs;
        addOrRemove = true;
        this.manageDynamicWidgets(category, oldCounts[category], objs.length);
      }
    }

    if (addOrRemove) {
      for (const obj of Object.values(PO)) {
        obj.removeDynamicCommands();              // Remove all SEET dynamic cmd event listeners
        obj.addDynamicCommands(ECOJSON);          // Manage dynamic SEET event listeners on all PO objects (controlStates)
      }
    }
  }

  manageDynamicWidgets(category = null, oldCount = 0, newCount = null) {
    var difference = newCount - oldCount;
    var action = (Math.sign(difference) == -1 ? "remove" : "add");
    var type = buildSettings.EBO.translation[category];
    
    if (type != undefined) {

      for (var i = 0; i < Math.abs(difference); i++) {                                                                  // Loop through all light btns
        if (action == "remove") {
          var index = (oldCount - 1) - i;
          var controllerName = "controlWidgetState" + type.capitalize() + index + "Obj";
          var widgetName = type + "WidgetObj" + index;
          PO[controllerName].removeAllCommands();                                                                       // Remove all SEET dynamic cmd event listeners from controller about to be deleted
          delete PO[controllerName];
          this[widgetName].remove();
          delete this[widgetName];
        } else if (action == "add") {
          var index = oldCount + i;
          var controllerName = "controlWidgetState" + type.capitalize() + index + "Obj";
          var widgetName = type + "WidgetObj" + index;
          switch (type) {
            case "light": {
              this[widgetName] = new lightWidget();
              PO[controllerName] = new controlWidgetStateLight(index, this[widgetName]);
              break; }
            case "shade": {
              this[widgetName] = new shadeWidget();
              PO[controllerName] = new controlWidgetStateShade(index, this[widgetName]);
              break; }
            case "privacyGlass": {
              this[widgetName] = new privacyGlassWidget();
              PO[controllerName] = new controlWidgetStatePrivacyGlass(index, this[widgetName]);
              break; }
            case "thermostat": {
              this[widgetName] = new thermostatWidget();
              PO[controllerName] = new controlWidgetStateThermostat(index, this[widgetName]);
              break; }
          }
          PO[controllerName].init();
        }
      }
    }
  }

  serialConnectedCheck() {                                                                                                                  // Check if keyboard is connected
    keyboardObj.isAttached().then((isConnected) => {
      if (this.keyboardStatus != isConnected) {
        if (isConnected) diagnosticsObj.update("IBIDevice", "USB", "Connected", { message: "IBI Device connected to the Device." });
        else diagnosticsObj.update("IBIDevice", "USB", "Disconnected", { message: "IBI Device disconnected from the Device." });
      }
      this.keyboardStatus = isConnected;
    }).catch((error) => {
      diagnosticsObj.update("IBIDevice", "USB", "Error", { error: "IBI Device initialization failed." });
    });
  }

  GPIOInitialization() {
    diagnosticsObj.update("pillowSpeaker", "GPIO", "Initialized", { message: "Environmental Buttons Device is Initialized." });
  }

  GPIOConnectedCheck() {                                                                                                           // Check if GPIO connectors left and right are connected and connected in the right order
    // Report if sides of the GPIO connector are connected or not
    if (gpioObj.checkConnection()) diagnosticsObj.update("pillowSpeaker", "GPIO", "Connected", { message: "Environmental Buttons Device is connected." });
    else diagnosticsObj.update("pillowSpeaker", "GPIO", "Disconnected", { message: "Environmental Buttons Device is disconnected." });
  }

  restServerInit() {
    if (settings.EBOActive) diagnosticsObj.update("ecoStruxure", "ecoStruxureToDevice", "Initialized", { message: "RESTful server class is initialized.", sourceURL: settings.deviceRestfulProtocol + json.deviceFQD + ":" + settings.deviceRestfulServerPort + "/EcoStruxure"  });        // Report to the diagnosticsObj that the ecoStruxureToDevice connection is initialized
    diagnosticsObj.update("clinicalPC", "restful", "Initialized", { message: "RESTful server class is initialized.", sourceURL: settings.deviceRestfulProtocol + json.deviceFQD + ":" + settings.deviceRestfulServerPort + "/samsung" });                                             // Resful server is now itialized which recieves calls from the 
    diagnosticsObj.update("clinicalPC", "restful", "Not Connected", { message: "Clinical PC client has not yet connected." });                                      // Report that the "clinicalPC" is "Not Connected" because it is not a persistent device in the diagnostics widget
  }

  wsStartup() {
    // Report the initialization of the websockets server for use by each of the connections
    diagnosticsObj.update("digitalWhiteboard", "websockets", "Initialized", { message: "Initialized Digital Whiteboard WebSockets Server.", targetURL: (settings.digitalWhiteboard.url != "" && settings.digitalWhiteboard.url != undefined) ? settings.digitalWhiteboard.url : "Intentionally Null" });
    diagnosticsObj.update("clinicalPC", "websockets", "Initialized", { message: "Initialized Clinical PC WebSockets Server.", sourceURL: settings.deviceRestfulProtocol + json.deviceFQD + ":8080" });
    diagnosticsObj.update("simulatorOne", "websockets", "Initialized", { message: "Initialized Simulator WebSockets Server.", sourceURL: settings.deviceRestfulProtocol + json.deviceFQD + ":8080" });
    diagnosticsObj.update("simulatorTwo", "websockets", "Initialized", { message: "Initialized Simulator WebSockets Server.", sourceURL: settings.deviceRestfulProtocol + json.deviceFQD + ":8080" });
    
    // Report that the connections have not yet been connected
    diagnosticsObj.update("digitalWhiteboard", "websockets", "Disconnected", { message: "Digital Whiteboard client has not yet connected." });      // Report the whiteboard being disconnected because it is always supposed to be connected
    diagnosticsObj.update("clinicalPC", "websockets", "Not Connected", { message: "Clinical PC client has not yet connected.", sourceURL: settings.deviceRestfulProtocol + json.deviceFQD + ":8080" });                   // Report that the "clinicalPC" is "Not Connected" because it is not a persistent device in the diagnostics widget
    diagnosticsObj.update("simulatorOne", "websockets", "Not Connected", { message: "Simulator client has not yet connected." });                   // Report that the "simulator" is "Not Connected" because it is not persistent device in the diagnostics widget
    diagnosticsObj.update("simulatorTwo", "websockets", "Not Connected", { message: "Simulator client has not yet connected." });                   // Report that the "simulator" is "Not Connected" because it is not persistent device in the diagnostics widget
  }

  processJSONControl(inboundJson, deviceID = null) {                                                                                        // Update 
    this.console.log("processJSONControl ", inboundJson);
    switch (inboundJson.control.function) {
      case "subscribe": {                                                                                                                   // If client request is to subscibe to the wsBroadcast        
        switch (inboundJson.control.clientType) {                                                                                           // Based on the clientType we can process the subscribe nessage and report it correctly to the diagnosticsObj
          case "codeboardClient": {                                                                                                 // If the "codeboardClient" is trying to subscribe
            codeboardControllerObj.open();                                                                                          // Open digital whiteboard iframe, because the digital whiteboard client is ready for display
            if (deviceID == null) deviceID = "codeboard";
            return this.msgSubscribeCodeboardClient.bind(this)(deviceID);                                                           // Retrieve and return the json response(s) to the subscribe call
            break; }
          case "digitalWhiteboardClient": {                                                                                                 // If the "digitalWhiteboardClient" is trying to subscribe
            digitalWhiteboardControllerObj.open();                                                                                          // Open digital whiteboard iframe, because the digital whiteboard client is ready for display
            if (deviceID == null) deviceID = "digitalWhiteboard";
            diagnosticsObj.update(deviceID, "websockets", "Connected", { message: "Connected and ready for communication." });              // Update the diagnosticsObj that this client connected
            return this.msgSubscribeDigitalWhiteboardClient.bind(this)(deviceID);                                                           // Retrieve and return the json response(s) to the subscribe call
            break; }
          case "clinicalPCClient": {
            if (deviceID == null) deviceID = "clinicalPC";
            diagnosticsObj.update(deviceID, "websockets", "Connected", { message: "Connected and ready for communication." });              // Update the diagnosticsObj that this client connected
            return this.msgSubscribeClinicalPCClient.bind(this)(deviceID);                                                                  // Retrieve and return the json response(s) to the subscribe call
            break; }
          case "simulatorClient": {
            if (deviceID == null) deviceID = "simulatorOne";
            var msg = { message: "Connected and ready for communication." };
            if (inboundJson.control.username != undefined) msg.username = inboundJson.control.username;                                     // Add the username if specified
            else this.console.error("No username defined by: " + deviceID);                                                                 // Report that no username is defined
            diagnosticsObj.update(deviceID, "websockets", "Connected", msg);                                                                // Update the diagnosticsObj that this client connected
            return this.msgSubscribeSimulatorClient.bind(this)(deviceID);                                                                   // Retrieve and return the json response(s) to the subscribe call
            break; }
        }
        break; }
      case "post": {                                                                                                                        // If client request is to "post" or control the Device app in some way             
        switch (inboundJson.control.clientType) {                                                                                           // Based on the clientType lets determin what control actions are allowed
          case "clinicalPCClient": {
            if (deviceID == null) deviceID = "clinicalPC";
            diagnosticsObj.update(deviceID, "websockets", "Connected & Active", { message: "Clinical PC client sent data." });
            delete inboundJson.control.function;
            var paths = objectPaths(inboundJson.control);
            for (var i=0; i<paths.length; i++) {
              switch (paths[i]) {
                case ".samsungSource": {
                  this.samsungSourceSwitchDeviceID = deviceID;
                  processJSONOBJ.processJSON("samsungSource", Number(inboundJson.control.samsungSource)); 
                  break; }
              }
            }
            break; }
          case "simulatorClient": {
            if (deviceID == null) deviceID = "simulatorOne";
            diagnosticsObj.update(deviceID, "websockets", "Connected & Active", { message: "Simulator client sent data." });
            delete inboundJson.control.function;
            var paths = objectPaths(inboundJson.control);
            for (var i=0; i<paths.length; i++) {
              switch (paths[i]) {
                case ".keyPress.cmd": { 
                  this.manageKeyPress(inboundJson.control.keyPress);               // Save the key, send it over websockets, and control device with it
                  break; }
                case ".caregilityCall": {
                  if (settings.EISActive) {
                    if (inboundJson.control.caregilityCall) {
                      EISObj.receiveWorkflow({
                        workflowType: "C",
                        workflowName: "startCall"
                      });
                    } else {
                      EISObj.receiveWorkflow({
                        workflowType: "C",
                        workflowName: "endCall"
                      });
                    }
                  }
                  break; }
                case ".caregilityMonitoring": {
                  if (settings.EISActive) {
                    if (inboundJson.control.caregilityMonitoring) {
                      EISObj.receiveWorkflow({
                        workflowType: "C",
                        workflowName: "startMonitoring"
                      });
                    } else {
                      EISObj.receiveWorkflow({
                        workflowType: "C",
                        workflowName: "endMonitoring"
                      });
                    }
                  }
                  break; }
                case ".message": {
                  if (inboundJson.control.message == -1) SEET.dispatchEvent("HideMessage", { source: "simulator", cmd: "HideMessage" });              // Call to Deactivate the widget because the no message was selected.
                  else SEET.dispatchEvent("DisplayMessage", { source: "simulator", cmd: "DisplayMessage", value: inboundJson.control.message });      // Call to Activate the widget because a message was selected.
                  break; }
                case ".codeBlueCall": {
                  if (settings.EISActive) {
                    EISObj.receiveWorkflow({
                      workflowType: "H",
                      callType: "Code Blue Call",
                      callStatus: "Active"
                    });
                  }
                  break; }
                case ".samsungSource": {
                  this.samsungSourceSwitchDeviceID = deviceID;
                  processJSONOBJ.processJSON("samsungSource", Number(inboundJson.control.samsungSource));
                  break; }
                case ".reboot": {
                  system.reboot();
                  break; }
                case ".ATSCCommand": {
                  if (settings.videoSources.ATSC != undefined && settings.videoSources.ATSC.enabled) {
                    if (ATSCObj != undefined) ATSCObj.sendCommand(inboundJson.control.ATSCCommand);
                    else this.console.log("ATSC object is disabled cannot send ATSCCommand", inboundJson.control.ATSCCommand);
                  }
                  break; }
                case ".ExtronCommand": {
                  if (settings.extronActive) {
                    if (extronObj != undefined) extronObj.send(inboundJson.control.ExtronCommand);
                    else this.console.log("Extron object is disabled cannot send ExtronCommand", inboundJson.control.ExtronCommand);
                  }
                  break; }
                case ".internalSpeakers": {
                  if (json.status.controlState != "controlStateBase") processJSONOBJ.processJSON("controlState", "controlStateBase", { from: null, info: { internalSpeakers: inboundJson.control.internalSpeakers } });                     // Change control state to base state when the internal speakers are switched
                  processJSONOBJ.processJSON("internalSpeakers", inboundJson.control.internalSpeakers);
                  break; }
              }
            }    
            break; }
        }
        break; }
    }
  }

  wsClose(clientType, code, reason, deviceID = null) {
    this.console.log("WebSocket connection closed for: ", clientType);
    switch (clientType) {                                                                      // Which client connection closed
      case "digitalWhiteboardClient": {
        var messageObj = { message: "Digital Whiteboard client disconnected." };
        if (code != null && code != "") messageObj.code = code;
        if (reason != null && reason != "") messageObj.reason = reason;
        digitalWhiteboardControllerObj.close();
        if (deviceID == null) deviceID = "digitalWhiteboard";
        diagnosticsObj.update(deviceID, "websockets", "Disconnected", messageObj);
        break; }
      case "clinicalPCClient": {
        if (deviceID == null) deviceID = "clinicalPC";
        if (json.status.samsungSource != 1 && this.samsungSourceSwitchDeviceID == deviceID) {
          processJSONOBJ.processJSON("samsungSource", 1);
          this.samsungSourceSwitchDeviceID = null;
        }
        diagnosticsObj.update(deviceID, "websockets", "Not Connected", { message: "Websockets communication not yet established" });
        break; }
      case "simulatorClient": {
        if (deviceID == null) deviceID = "simulatorOne";
        if (json.status.samsungSource != 1 && this.samsungSourceSwitchDeviceID == deviceID) {
          processJSONOBJ.processJSON("samsungSource", 1);
          this.samsungSourceSwitchDeviceID = null;
        }
        diagnosticsObj.update(deviceID, "websockets", "Not Connected", { message: "Websockets communication not yet established" });
        break; }
    }
  }

  msgSubscribeCodeboardClient(deviceID) {
    this.wsJSONCompare["codeboardClient"] =  { "clientType": "codeboardClient", "type": "update", "room": json.room, "status": { "displayState": json.status.displayState } };
    return this.wsJSONCompare["codeboardClient"];
  }
  
  msgSubscribeDigitalWhiteboardClient(deviceID) {
    diagnosticsObj.update(deviceID, "websockets", "Connected & Active", { message: "Device WebSockets Server sent data." });
    this.wsJSONCompare["digitalWhiteboardClient"] =  { "clientType": "digitalWhiteboardClient", "type": "update", "room": json.room, "status": { "displayState": json.status.displayState } };
    return this.wsJSONCompare["digitalWhiteboardClient"];
  }
  
  msgSubscribeClinicalPCClient(deviceID) {
    diagnosticsObj.update(deviceID, "websockets", "Connected & Active", { message: "Device WebSockets Server sent data." });
    this.wsJSONCompare["clinicalPCClient"] =  { "clientType": "clinicalPCClient", "type": "update", "room": json.room, "status": { "samsungSource": json.status.samsungSource } };
    return this.wsJSONCompare["clinicalPCClient"];
  }

  msgSubscribeSimulatorClient(deviceID) {
    diagnosticsObj.update(deviceID, "websockets", "Connected & Active", { message: "Device WebSockets Server sent data." });

    var simulatorJSON = clone(json);
    simulatorJSON.type = "simulatorJSON";
    simulatorJSON.settings = clone(settings);
    simulatorJSON.controlWidget = {
      extron: ((extronObj != undefined) ? true : false),
      ATSC: ((ATSCObj != undefined) ? true : false)
    }
    simulatorJSON.buildSettings = simulatorSettingsBuilderObj.get();

    var diagnosticsStructureJSON = {
      type: "diagnosticsStructure",
      diagnosticsStructure: settings.diagnosticsStructure
    };

    var diagnosticsObjJSON = {
      type: "diagnosticsObj",
      diagnosticsObj: diagnosticsObj.getAllData()
    };

    var historicalKeys = {
      type: "historicalKeys",
      keys: this.keyPressHistory
    }

    return [simulatorJSON, diagnosticsStructureJSON, diagnosticsObjJSON, historicalKeys];
  }

  wsCurateUpdate(updates) { // [ { clientType: "simulatorClient", devices: [ "simulatorOne", "simulatorTwo" ] }, { clientType: "digitalWhiteboardClient" }... ];
    var methods = { "codeboardClient": this.msgUpdateCodeboardClient, "digitalWhiteboardClient": this.msgUpdateDigitalWhiteboardClient, "clinicalPCClient": this.msgUpdateClinicalPCClient, "simulatorClient": this.msgUpdateSimulatorClient };
    var messages = [];
    updates.forEach(update => {
      var msg = methods[update.clientType].bind(this)(update.devices);
      if (msg != null) messages.push(msg);
    });
    return messages;
  }

  msgUpdateCodeboardClient(deviceIDs = ["codeboard"]) {
    return this.compareJSON({ "clientType": "codeboardClient", "type": "update", "room": json.room, "status": { "displayState": json.status.displayState } });
  }

  msgUpdateDigitalWhiteboardClient(deviceIDs = ["digitalWhiteboard"]) {
    deviceIDs.forEach(deviceID => {
      diagnosticsObj.update(deviceID, "websockets", "Connected & Active", { message: "Device WebSockets Server sent data." });
    });
    return this.compareJSON({ "clientType": "digitalWhiteboardClient", "type": "update", "room": json.room, "status": { "displayState": json.status.displayState } });
  }

  msgUpdateClinicalPCClient(deviceIDs = ["clinicalPC"]) {
    deviceIDs.forEach(deviceID => {
      diagnosticsObj.update(deviceID, "websockets", "Connected & Active", { message: "Device WebSockets Server sent data." });
    });
    return this.compareJSON({ "clientType": "clinicalPCClient", "type": "update", "room": json.room, "status": { "samsungSource": json.status.samsungSource } });
  }

  msgUpdateSimulatorClient(deviceIDs = ["simulatorOne"]) {
    deviceIDs.forEach(deviceID => {
      diagnosticsObj.update(deviceID, "websockets", "Connected & Active", { message: "Device WebSockets Server sent data." });
    });

    var newJson = clone(json);
    newJson.clientType = "simulatorClient";
    newJson.type = "simulatorJSON";
    return newJson;
  }

  compareJSON(newJSON) {                                                                        // Compares the newJSON from the old JSON registered under "this.wsJSONCompare" for a specific clientType
    if (JSON.stringify(this.wsJSONCompare[newJSON.clientType]) != JSON.stringify(newJSON)) {
      this.wsJSONCompare[newJSON.clientType] = newJSON;
      return newJSON;
    } else return null;
  }

  manageKeyPress(keyPress) {                                                                                                          // Manage the keypresses of patient and simulator clients
    this.keyPressHistory.push(keyPress);                                                                                              // Save the keyPress
    if (this.keyPressHistory.length > 50) this.keyPressHistory.shift();                                                               // Limit the keyPressHistory to 5 total historically saved keys
    SEET.dispatchEvent(keyPress.cmd, { source: keyPress.source, cmd: keyPress.cmd, value: keyPress.value, info: keyPress.info });     // Dispatch the key over device
    wsSocketObj.wsBroadcast("simulatorClient", keyPress, "keyPress");                                                                 // Send the key over the websockets to all connected simulator clients
  }

  resetSpeakerState(speakerState, info) {                                                     // Reset the speaker state given the speakerState and info objects
    try {
      if (speakerState.output == "external") {
        processJSONOBJ.processJSON("volume", {
          output: 'internal',
          internal: speakerState.internal,
        });
  
        processJSONOBJ.processJSON("volume", {
          output: 'external',
          external: speakerState.external,
          mute: speakerState.mute
        }, info);
      }
      else {
        processJSONOBJ.processJSON("volume", {
            output: 'external',
            external: speakerState.external,
        });
  
        processJSONOBJ.processJSON("volume", {
            output: 'internal',
            internal: speakerState.internal,
            mute: speakerState.mute
        }, info);
      }
    } catch(err) {
      console.log("Failed to reset speakers: " + err.message);
    } 
    return true;
  }
}