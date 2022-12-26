//var gps = require("gps-tracking");
var gps = require('../index');

var options = {
  debug: true,
  port: 8090,
  device_adapter: 'CONCOXX3'
}

var server = gps.server(options, function (device, connection) {

  device.on('login_request', function (device_id, msg_parts) {
    // Some devices sends a login request before transmitting their position
    // Do some stuff before authenticate the device...

    // Accept the login request. You can set false to reject the device.
    this.login_authorized(true)

    device.send_command('1', 'DYD,000000#', 'ascii')
  })

  //PING -> When the gps sends their position
  device.on('ping', function (data) {
    //After the ping is received, but before the data is saved
    console.log('PING');
    console.log(data['date']);
    
    var d = new Date(data['date']);
    d.setTime( d.getTime() + 7*60*1000 );

    console.log(d);
    console.log(d.toISOString());
    console.log(data);
    return data

  });

  device.on('alarm', function (alarmCode, alarmData, msgParts) {
    console.log('ALARM');
    console.log(alarmData);
  });

  device.on('heartbeat', function (heartbeatData, msgParts) {
    console.log('HEARTBEAT');
    console.log(heartbeatData);
    device.send_response('13')
  });

  device.on('action', function (actionData, msgParts) {
    console.log('ACTION');
    console.log(actionData);
  });

});

server.setDebug(true);
