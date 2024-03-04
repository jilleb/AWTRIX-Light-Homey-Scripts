// awTrixWeather.js - Creates custom weather apps on the AWTrix Light / Ulanzi matrix
// Made by Jille, inspired by https://github.com/jeeftor/HomeAssistant 
// Global settings and configuration
// Device URI's for each of the devices you need in this script:
// OpenWeather Today's weather:
const uriOpenWeatherToday   = '86ecb891-214b-49b9-a4b3-f9fb47b42635';
// OpenWeather current weather:
const uriOpenWeatherCurrent = 'd702ccb4-deb6-4c32-b03f-2e5ff0a640f5';

// IP for the AwTrix light / Ulanzi matrix:
const awtrixIP = '192.168.1.14';

// Turn specific Apps on or off:
// Set to true to enable, false to disable
// Disabling means the app will not get any new data, 
// and will be deleted after reboot or 24 hours.
const ENABLE_MOON_APP = true; 
const ENABLE_WEATHER_APP = true; 
const ENABLE_MINTEMP_APP = true;
const ENABLE_MAXTEMP_APP = true;
const ENABLE_CURRENTWEATHER_APP = true;
const ENABLE_SUNSETSUNRISE_APP = true;


// You don't need to change anything below here


const createCustomApp = async (name, icon, text, overlay) => {
  // Construct the body of the message
  // Add more properties if needed
  const body = JSON.stringify({
    "icon": icon,
    "text": text,
    "lifetime": 86400, // removes app after x seconds
    "lifetimeMode": 0, // 0=delete app, 1=mark as staled
    "duration":10,
    "overlay": overlay,

    // other properties you can add:
    // "textCase": 0,  // 0=global, 1=upper, 2=as is
    // "topText": false,  // default
    // "textOffset": 0,
    // "center": false,  // for non-scrollable text
    // "color": "#FFFFFF",  // hex or rgb
    // "blinkText": 0,  // time in ms
    // "fadeText": 0,  // time in ms
    // "background": "#808080",
    // "pushIcon": 0,  // 0=icon fixed, 1=icon moves and disappears, 2=icon moves but comes back
    // "repeat": 1,  // -1 = indefinetely, number is number of times before the app ends
    // "duration": 10,  //
    // "overlay":"snow", //clear, snow, rain, storm, thunder, drizzle
    // "pos": 0,
    // "bar": [0,0,0,0,0,0,0,0,1,2,3,4],
    // "line": [9,9,7,7,8,8,"#FF00FF"],
    // "autoScale": true,
    // "progress": 60,
    // "progressC": "#0000FF",
    // "rainbow": false, // true or false
    // "progressBC": "#C0C0C0",
    // "pos": 2,  // position of app in custom loop
    // "draw": [  
    //     {"dc": [28, 4, 3, "#FF0000"]},  
    //     {"dr": [20, 4, 4, 4, "#0000FF"]},  
    //     {"dt": [0, 0, "Hello", "#00FF00"]}  
    //     ],  // 
    //"noScroll": false,
    //"scrollSpeed": 100,
    //"effect": "PingPong",  // example "PingPong" https://blueforcer.github.io/awtrix-light/#/effects
    //"effectSettings":{
    //     "speed":3,
    //     "palette":"Forest",
    //     "blend":true

  });

  // Log the body of the message to the console
  console.log('Creating AWTrix app "%s" with the following properties:\n', name, body);

  // Call the flow card action
  await Homey.flow.runFlowCardAction({
    uri: 'homey:manager:logic',
    id: 'http_advanced',
    args: {
      method: 'post',
      url: `http://${awtrixIP}/api/custom?name=${name}`,
      headers: 'Content-Type: application/json',
      body,
    },
  });
};


// Translation between current moonPhase and what icon goes with it
const getMoonPhaseIcon = (moonPhaseType) => {
  const moonIcons = {
    'NM': 'new_moon',
    'ZS': 'waxing_crescent',
    'ZH': 'first_quarter',
    'ZM': 'waxing_gibbous',
    'VM': 'full_moon',
    'AM': 'waning_gibbous',
    'AH': 'last_quarter',
    'AS': 'waning_crescent',
    'default': 'default_moon',
  };

  console.log(`Moon icon:\t${moonIcons[moonPhaseType]}`);
  return moonIcons[moonPhaseType] || moonIcons['default'];
};

// Translation between current weather condition and what icon goes with it
const getWeatherIcon = (weatherCondition) => {
  const weatherIcons = {
    'Clouds': 'w-cloudy',
    'Rain': 'w-rainy',
    'Clear': 'w-sunny',
    'Drizzle': 'w-rainy',
    'Haze': 'w-fog',
    'Mist': 'w-fog',
    'Fog': 'w-fog',
    'Thunderstorm': 'w-lightning',
    'Snow': 'w-snowy',
    'Extreme': 'w-exceptional',
    'default': 'w-defau',
    // Add additional mappings as needed
  };

  console.log(`Weather icon:\t${weatherIcons[weatherCondition]}`);
  return weatherIcons[weatherCondition] || weatherIcons['default']; 
};



// Generic logic to get a specific value of a device. 
// Depending on the device, it has different capabilities that can report a value
// Example: 
// getCapabilityValue(uriOpenWeatherToday, 'measure_humidity');
const getCapabilityValue = async (deviceId, capabilityId) => {
  try {
    // Get all devices as an array
    const devices = Object.values(await Homey.devices.getDevices());

    // Find the target device
    const targetDevice = devices.find(device => device.id === deviceId);

    if (!targetDevice) {
      throw new Error('Target device not found');
    }

    // Check if the device has the specified capability
    if (!targetDevice.capabilitiesObj || !targetDevice.capabilitiesObj[capabilityId]) {
      throw new Error(`Target device does not have the ${capabilityId} capability`);
    }

    // Get the value of the specified capability
    const capabilityValue = targetDevice.capabilitiesObj[capabilityId].value;

    // Log the current capability value
  console.log(`Current ${capabilityId.padEnd(25, ' ')}:\t`, capabilityValue);

    return capabilityValue; // Return the capability value if needed
  } catch (error) {
    console.error(`Error getting ${capabilityId} value:`, error.message);
    throw error; // Re-throw the error for handling in the calling function
  }
};

const createCustomAppFromSources = async () => {
  try {
    let deviceId = uriOpenWeatherToday;

    // Get the values for different capabilities
    const moonPhaseType = await getCapabilityValue(deviceId, 'moonphase_type');
    const weatherCondition = await getCapabilityValue(deviceId, 'conditioncode');
    const weatherMaxTemp = await getCapabilityValue(deviceId, 'measure_temperature_max');
    const weatherMinTemp = await getCapabilityValue(deviceId, 'measure_temperature_min');
    const weatherRainMM = await getCapabilityValue(deviceId, 'measure_rain');
    const weatherRainChance = await getCapabilityValue(deviceId, 'measure_pop');
    const weatherSunrise = await getCapabilityValue(deviceId, 'sunrise');
    const weatherSunset = await getCapabilityValue(deviceId, 'sunset');


    deviceId = uriOpenWeatherCurrent;
    const weatherCurrentTemp = await getCapabilityValue(deviceId, 'measure_temperature');
    const weatherCurrentCondtion = await getCapabilityValue(deviceId, 'conditioncode');


    if (ENABLE_MOON_APP) {
      createCustomApp("moon", getMoonPhaseIcon(moonPhaseType), ` `, false);
    }

    // Determine the weather overlay based on the weather condition
    let weatherOverlay = '';
    if (weatherCurrentCondtion === 'Rain') {
      weatherOverlay = 'rain';
    } else if (weatherCurrentCondtion === 'Snow') {
      weatherOverlay = 'snow';
    } else if (weatherCurrentCondtion === 'Thunderstorm') {
      weatherOverlay = 'thunder';
    } else if (weatherCurrentCondtion === 'Drizzle') {
      weatherOverlay = 'drizzle';
    } else {
      weatherOverlay = 'clear'; // Default overlay for other conditions
    }


    if (ENABLE_WEATHER_APP) {
      createCustomApp("Weather", getWeatherIcon(weatherCondition), `${weatherRainChance}% ${weatherRainMM}mm`, weatherOverlay);
    }

    if (ENABLE_CURRENTWEATHER_APP) {
      createCustomApp("CurrentWeather", getWeatherIcon(weatherCurrentCondtion), `${weatherCurrentTemp}°C`, weatherOverlay);
    }

    if (ENABLE_MAXTEMP_APP) {
      createCustomApp("Maxtemp", "w-maxtemp", `${weatherMaxTemp}°C`);
    }

    if (ENABLE_MINTEMP_APP) {
      createCustomApp("Mintemp", "w-mintemp", `${weatherMinTemp}°C`);
    }

    if (ENABLE_SUNSETSUNRISE_APP) {
      createCustomApp("Sunrise", "w-sunrise", `${weatherSunrise}`);
      createCustomApp("Sunset", "w-sunset", `${weatherSunset}`);

    }

  } catch (error) {
    console.error('Error creating custom apps:', error.message);
  }
};

// Trigger the custom app creation logic
createCustomAppFromSources();




/*
// Get the value for different capabilities
getCapabilityValue(deviceId, 'conditioncode');
getCapabilityValue(deviceId, 'measure_wind_direction_string');
getCapabilityValue(deviceId, 'sunrise');
getCapabilityValue(deviceId, 'sunset');
getCapabilityValue(deviceId, 'measure_rain');
getCapabilityValue(deviceId, 'measure_pop');
getCapabilityValue(deviceId, 'measure_humidity');
getCapabilityValue(deviceId, 'measure_wind_strength');
*/
