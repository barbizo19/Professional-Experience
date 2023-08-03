// This class is for Pavilion Setting JSON Validation
class settingsValidator extends superConsole {
  constructor() {
    super();
  }

  init() {
    super.init();
  }

  validate(str, source) {
    var resp = { "status": "error",
                 "message": source + " settings: ",     // Where source is "server" or "local"
                 "json": null };

    // Parse the JSON string
    try {
      resp.json = JSON.parse(str);
    } catch (error) {
      resp.message += "Unable to parse settings json in classSettingsValidator. ";
      resp.status = "parseFailed";
      return(resp);
    }

    // Validate properties
    if (!validateProperty(resp.json, "settingsVersion", "string")) return(resp);
    var [major, minor, build] = resp.json.settingsVersion.split(/[.-]+/);                   // Split the settings version into major, minor, & build versions
    var [minMajor, minMinor, minBuild] = minimumSettingsVersion.split(/[.-]+/);                    // Split the minimum acceptable version into major, minor, & build versions
    var [currentMajor, currentMinor, currentBuild] = softwareBuildVersion.split(/[.-]+/);   // Split the current software build version into major, minor, & build versions
    if (major == undefined) {
      resp.message += `Major of settingsVersion is undefined.`
      return(resp);
    }
    if (minor == undefined) {
      resp.message += `Minor of settingsVersion is undefined.`
      return(resp);
    }
    if (build == undefined) {
      resp.message += `Build of settingsVersion is undefined.`
      return(resp);
    }

    if (Number(major) < Number(minMajor) || Number(major) > Number(currentMajor) || Number(minor) < Number(minMinor) || 
        Number(minor) > Number(currentMinor) || Number(build) < Number(minBuild) || Number(build) > Number(currentBuild)) {
      resp.message += "Settings Version incompatible with this Device.";
      resp.status = "settingsVersionIncompatible";
      return(resp);
    }

    if (!validateProperty(resp.json, "device", "string")) return(resp);
    if (!validateProperty(resp.json, "room", "string")) return(resp);
    if (!validateProperty(resp.json, "department", "string")) return(resp);
    if (!validateProperty(resp.json, "facility", "string")) return(resp);
    if (!validateProperty(resp.json, "deviceRestfulProtocol", "string")) return(resp);
    if (!validateProperty(resp.json, "networkDomain", "string")) return(resp);
    if (!validateProperty(resp.json, "deviceSerial", "string")) return(resp);
    if (resp.json.deviceSerial != getDeviceUID()) {
      resp.message += "Device serial numbers do not match.";
      resp.status = "deviceSerialDoesNotMatch";
      return(resp);
    }
    if (!validateProperty(resp.json, "TVURL", "string")) return(resp);
    if (resp.json.EBOActive) { 
      if (!validateProperty(resp.json, "EBOURL", "string")) return(resp);
      if (!validateProperty(resp.json, "EBOPathURL", "string")) return(resp);
      if (!validateProperty(resp.json, "EBOWaitTime", "number")) return(resp);
    }
    if (!validateProperty(resp.json, "diagnosticsKeyPass", "string")) return(resp);
    if (resp.json.diagnosticsKeyPass.length != 8) {
      resp.message += "diagnosticsKeyPass must be eight digits.";
      return(resp);
    }
    if (resp.json.EBOActive) if (!validateProperty(resp.json, "getEBOTokenURL", "string")) return(resp);
    if (resp.json.EISActive) if (!validateProperty(resp.json, "EISDNS", "string")) return(resp);
    if (!validateProperty(resp.json, "providerAPIURL", "string")) return(resp);
    if (!validateProperty(resp.json, "providerAPIWait", "number")) return(resp);
    if (!validateProperty(resp.json, "personnelExpiration", "number")) return(resp);
    if (!validateProperty(resp.json, "reorderCardsInterval", "number")) return(resp);
    if (!validateProperty(resp.json, "processQueueInterval", "number")) return(resp);
    if (!validateProperty(resp.json, "mediaWidgetBackground", "string")) return(resp);
    if (!validateProperty(resp.json, "mediaWidgetCalloutText", "boolean")) return(resp);
    if (!validateProperty(resp.json, "mediaWidgetCalloutPointer", "boolean")) return(resp);
    if (!validateProperty(resp.json, "thermostatMax", "number")) return(resp);
    if (!validateProperty(resp.json, "thermostatDefaultSetPoint", "number")) return(resp);
    if (!validateProperty(resp.json, "thermostatMin", "number")) return(resp);
    if (resp.json.videoSources.triplePlay != undefined && resp.json.videoSources.triplePlay.enabled) {
      if (!validateProperty(resp.json, "triplePlayCommandPassthru", "boolean")) return(resp);
    }
    if (resp.json.triplePlayCommandPassthru && (resp.json.videoSources.triplePlay == undefined || (resp.json.videoSources.triplePlay != undefined && !resp.json.videoSources.triplePlay.enabled))) {
      resp.message += `triplePlayCommandPassthru is "true" even though videoSources.triplePlay is "false" or undefined.`;
      return(resp);
    }
    if (!validateProperty(resp.json, "clinicalPCTime", "number")) return(resp);
    if (!validateProperty(resp.json, "backlightOn", "number")) return(resp);
    if (resp.json.backlightOn < 0 || resp.json.backlightOn > 100) {
      resp.message += "backlightOn is not in valid range.";
      return(resp);
    }
    if (!validateProperty(resp.json, "backlightOff", "number")) return(resp);
    if (resp.json.backlightOff < 0 || resp.json.backlightOff > 100) {
      resp.message += "backlightOff is not in valid range.";
      return(resp);
    }
    if (!validateProperty(resp.json, "backlightNight", "number")) return(resp);
    if (resp.json.backlightNight < 0 || resp.json.backlightNight > 100) {
      resp.message += "backlightNight is not in valid range.";
      return(resp);
    }
    if (!validateProperty(resp.json, "externalVolumeMaximum", "number")) return(resp);
    if (!validateProperty(resp.json, "externalVolumeBase", "number")) return(resp);
    if (!validateProperty(resp.json, "internalVolumeMaximum", "number")) return(resp);
    if (!validateProperty(resp.json, "internalVolumeBase", "number")) return(resp);
    if (!validateProperty(resp.json, "deviceRestfulServerPort", "number")) return(resp);
    if (!validateProperty(resp.json, "IPAddressLookupInterval", "number")) return(resp);
    if (!validateProperty(resp.json, "networkStatusInterval", "number")) return(resp);
    if (!validateProperty(resp.json, "pingServerIPAddress", "string")) return(resp);
    if (resp.json.EISActive) {
      if (!validateProperty(resp.json, "caregilityID", "string")) return(resp);
      if (!validateProperty(resp.json, "hillromID", "string")) return(resp);
    }
    if (!validateProperty(resp.json, "rebootCode", "string")) return(resp);
    if (resp.json.rebootCode.length < 4) {
      resp.message += "rebootCode must be at least four digits.";
      return(resp);
    }
    if (!validateProperty(resp.json, "serialPorts", "object")) return(resp);
    if (resp.json.extronActive) {
      if (!validateProperty(resp.json, "serialPorts.extron", "number")) return(resp);
      if (!validateProperty(resp.json, "extronPorts", "object")) return(resp);
    }
    if (!validateProperty(resp.json, "defaultChannel", "object")) return(resp);
    if (!validateProperty(resp.json, "defaultChannel.channel", "string")) return(resp);
    if (!validateProperty(resp.json, "defaultChannel.source", "string")) return(resp);
    if (!validateProperty(resp.json, "defaultChannelTimeout", "number")) return(resp);
    if (!resp.json.triplePlayCommandPassthru) {
      if (!validateProperty(resp.json, "blankChannelImage", "string")) return(resp);
    }

    if (!validateProperty(resp.json, "videoSources", "object")) return(resp);
    if (resp.json.videoSources.triplePlay != undefined && resp.json.videoSources.triplePlay.enabled) {
      if (!validateProperty(resp.json, "triplePlay.IP", "string")) return(resp);
      if (!validateProperty(resp.json, "triplePlay.serial", "string")) return(resp);
      if (!validateProperty(resp.json, "triplePlay.clientIDWait", "number")) return(resp);
      if (!validateProperty(resp.json, "triplePlay.natusVODName", "string")) return(resp);
      if (!validateProperty(resp.json, "triplePlay.natusVODDuration", "number")) return(resp);
      if (!validateProperty(resp.json, "triplePlay.extronSource", "string")) return(resp);
      if (!validateProperty(resp.json, "triplePlay.natusInternalVolume", "number")) return(resp);
      if (!validateProperty(resp.json, "triplePlay.natusExternalVolume", "number")) return(resp);
    }
    if (!validateProperty(resp.json, "menu", "object")) return(resp);
    if (resp.json.extronActive) if (!validateProperty(resp.json, "menu.extronSource", "boolean")) return(resp);
    if (!resp.json.extronActive && resp.json.menu.extronSource) {
      resp.message += `menu.extronSource is "true" even though extronActive is "false" or undefined.`;
      return(resp);
    }
    if (resp.json.voiceActive) if (!validateProperty(resp.json, "menu.voice", "boolean")) return(resp);
    if (!resp.json.voiceActive && resp.json.menu.voice) {
      resp.message += `menu.voice is "true" even though voiceActive is "false" or undefined.`;
      return(resp);
    }
    if (resp.json.SAPActive) if (!validateProperty(resp.json, "menu.SAP", "boolean")) return(resp);
    if (!resp.json.SAPActive && resp.json.menu.SAP) {
      resp.message += `menu.SAP is "true" even though SAPActive is "false" or undefined.`;
      return(resp);
    }
    if (!validateProperty(resp.json, "digitalWhiteboard", "object")) return(resp);
    if (!validateProperty(resp.json, "digitalWhiteboard.url", "string")) return(resp);
    if (!validateProperty(resp.json, "digitalWhiteboard.reconnectTimeout", "number")) return(resp);
    if (!validateProperty(resp.json, "digitalWhiteboard.loadingTimeout", "number")) return(resp);
    if (!validateProperty(resp.json, "digitalWhiteboard.retryInterval", "number")) return(resp);
    var validDisplayStates = ["offState", "comboState", "nightState", "sleepState"];
    if (resp.json.initialValues.displayState != undefined && !validDisplayStates.includes(resp.json.initialValues.displayState)) {
      if (!validateProperty(resp.json, "initialValues.displayState", "string")) return(resp);
      resp.message += `displayState is set to "` + resp.json.initialValues.displayState + `" which is invalid. Valid values include: "offState", "comboState", "nightState" (most common), "sleepState"`;
      return(resp);
    }
    var validControlState = ["controlStateBase", "controlWidgetStateChannelEntry", "controlWidgetStateChannelSelector", "controlWidgetStateCornerText", "controlWidgetStateDiagnostics", "controlWidgetStateLight", "controlWidgetStateMedia" , "controlWidgetStateMenu", "controlWidgetStatePrivacyGlass", "controlWidgetStateShade", "controlWidgetStateThermostat", "controlWidgetStateVolume"];
    if (resp.json.initialValues.controlState != undefined && !validControlState.includes(resp.json.initialValues.controlState)) {
      if (!validateProperty(resp.json, "initialValues.controlState", "string")) return(resp);
      resp.message += `controlState is set to "` + resp.json.initialValues.controlState + `" which is invalid. Valid values include: "controlStateBase" (most common), "controlWidgetStateChannelEntry", "controlWidgetStateChannelSelector", "controlWidgetStateCornerText", "controlWidgetStateDiagnostics", "controlWidgetStateLight", "controlWidgetStateMedia" (only if triplePlay video source is enabled), "controlWidgetStateMenu", "controlWidgetStatePrivacyGlass", "controlWidgetStateShade", "controlWidgetStateThermostat", "controlWidgetStateVolume"`;
      return(resp);
    }
    if (!validateProperty(resp.json, "initialValues.lastUserSelectedVolumeOutput", "string")) return(resp);
    if (!validateProperty(resp.json, "initialValues.internalSpeakers", "boolean")) return(resp);
    if (!validateProperty(resp.json, "initialValues.samsungSource", "number")) return(resp);
    if (resp.json.extronActive) {
      if (!validateProperty(resp.json, "initialValues.extronSource", "string")) return(resp);
      if (resp.json.EISActive) {
        if (!validateProperty(resp.json, "initialValues.lastExtronSource", "string")) return(resp);
      }
    }
    if (!validateProperty(resp.json, "initialValues.weather", "boolean")) return(resp);
    if (resp.json.voiceActive) {
      if (!validateProperty(resp.json, "initialValues.voice", "boolean")) return(resp);
    }
    if (!validateProperty(resp.json, "initialValues.volume.external", "number")) return(resp);
    if (resp.json.initialValues.volume.external < 0 || resp.json.initialValues.volume.external > 100) {
      resp.message += "external volume is not in valid range.";
      return(resp);
    }
    if (!validateProperty(resp.json, "initialValues.volume.internal", "number")) return(resp);
    if (resp.json.initialValues.volume.internal < 0 || resp.json.initialValues.volume.internal > 100) {
      resp.message += "internal volume is not in valid range.";
      return(resp);
    }
    if (!validateProperty(resp.json, "initialValues.volume.output", "string")) return(resp);
    if (!['external', 'internal'].includes(resp.json.initialValues.volume.output)) {
      resp.message += "output mode is not in valid.";
      return(resp);
    }
    if (!validateProperty(resp.json, "initialValues.volume.mute", "boolean")) return(resp);
    if (!validateProperty(resp.json, "diagnosticsStructure")) return(resp);
    if (!validateProperty(resp.json, "widgetLegends")) return(resp);
    if (!validateProperty(resp.json, "weather.location", "string")) return(resp);
    if (!validateProperty(resp.json, "weather.temperaturesURL", "string")) return(resp);
    if (!validateProperty(resp.json, "weather.forecastURL", "string")) return(resp);
    if (!validateProperty(resp.json, "weather.logoSmall", "string")) return(resp);
    if (!validateProperty(resp.json, "weather.logoLarge", "string")) return(resp);
    if (!validateProperty(resp.json, "weather.logoBackground", "string")) return(resp);
    if (!validateProperty(resp.json, "weather.background", "string")) return(resp);
    if (!validateProperty(resp.json, "weather.queryAfterExpiration", "number")) return(resp);
    if (!validateProperty(resp.json, "weather.queryTimeout", "number")) return(resp);
    if (!validateProperty(resp.json, "weather.failureRetry", "number")) return(resp);
    if (!validateProperty(resp.json, "logs", "object")) return(resp);
    if (!validateProperty(resp.json, "logs.master", "boolean")) return(resp);

    //...  Finish here...

    // Everything passed so return success
    resp.status = "success";
    resp.message += "Success";
    return(resp);

    function validateProperty(jsn, path, type = null, msg = null) {
      if (!propertyExists(jsn, path)) {
        resp.message += `Property "` + path + `" does not exist in the JSON`;
        if (msg != null) resp.message += " | " + msg;
        return false;
      }
      if (type != null && propertyType(jsn, path) != type) {
        resp.message += `Property "` + path + `" is the wrong type in the JSON`;
        if (msg != null) resp.message += " | " + msg;
        return false;
      }
      return true;
    }

    function propertyExists(jsn, path) {
      try {
        var val = eval("jsn." + path);
        if (val != undefined) return true; else return false;
      } catch (error) {
        return false;
      }
    }
    
    function propertyType(jsn, path) {
      if (Array.isArray(eval("jsn." + path))) return "array";
      else return(typeof eval("jsn." + path));
    }
  }
}