import * as mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('IoT Simulator connected to Mosquitto broker at localhost:1883');
  console.log('Starting automated telemetry cycle (Normal -> Temperature Anomaly -> Recovery)...');
  startTelemetryLoop();
});

let cycleCount = 0;

function startTelemetryLoop() {
  setInterval(() => {
    cycleCount++;
    console.log(`\n--- Telemetry Cycle #${cycleCount} ---`);

    // Zones definition
    let coldTemp = 2.1 + (Math.random() - 0.5) * 0.4; // normal: ~2°C
    let coldHum = 72 + (Math.random() - 0.5) * 2;    // normal: ~72%

    let frozenTemp = -21.4 + (Math.random() - 0.5) * 0.8; // normal: ~-21°C
    let frozenHum = 53 + (Math.random() - 0.5) * 3;      // normal: ~53%

    let dryTemp = 23.5 + (Math.random() - 0.5) * 1.2; // normal: ~23°C
    let dryHum = 61 + (Math.random() - 0.5) * 4;      // normal: ~61%

    let mode = 'NORMAL';

    // Trigger COLD zone temperature violation from cycle 6 to 20 (75 seconds of anomaly)
    // Safe cold limit: max temp 4°C, max humidity 80%.
    // Our anomaly limit is 1 minute (60s) in iot-service config.
    if (cycleCount >= 6 && cycleCount <= 20) {
      mode = 'ANOMALY (COLD Zone Freezer Door Left Open)';
      coldTemp = 9.8 + (Math.random() - 0.5) * 0.6; // Violated (> 4°C)
      coldHum = 87 + (Math.random() - 0.5) * 1.5;   // Violated (> 80%)
    } else if (cycleCount > 20) {
      mode = 'RECOVERED (Normal)';
    }

    console.log(`Status: ${mode}`);
    console.log(`COLD Zone   => Temp: ${coldTemp.toFixed(2)}°C, Humidity: ${coldHum.toFixed(2)}%`);
    console.log(`FROZEN Zone => Temp: ${frozenTemp.toFixed(2)}°C, Humidity: ${frozenHum.toFixed(2)}%`);
    console.log(`DRY Zone    => Temp: ${dryTemp.toFixed(2)}°C, Humidity: ${dryHum.toFixed(2)}%`);

    // Publish to MQTT topics separately
    // COLD
    client.publish('warehouse/COLD/temperature', coldTemp.toFixed(2));
    client.publish('warehouse/COLD/humidity', coldHum.toFixed(2));

    // FROZEN
    client.publish('warehouse/FROZEN/temperature', frozenTemp.toFixed(2));
    client.publish('warehouse/FROZEN/humidity', frozenHum.toFixed(2));

    // DRY
    client.publish('warehouse/DRY/temperature', dryTemp.toFixed(2));
    client.publish('warehouse/DRY/humidity', dryHum.toFixed(2));

  }, 5000); // Publish every 5 seconds (fast-forward simulation of 30-sec periods)
}
