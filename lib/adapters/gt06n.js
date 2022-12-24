/* Original code: https://github.com/cnberg/gps-tracking-nodejs/blob/master/lib/adapters/gt06.js */
var f = require('../functions');
var crc = require('crc16-ccitt-node');

exports.protocol = 'GT06N';
exports.model_name = 'GT06N';
exports.compatible_hardware = ['GT06N/supplier'];

var adapter = function (device) {
  if (!(this instanceof adapter)) {
    return new adapter(device);
  }

  this.format = {'start': '(', 'end': ')', 'separator': ''};
  this.device = device;
  this.__count = 1;

  /*******************************************
   PARSE THE INCOMING STRING FROM THE DECIVE
   You must return an object with a least: device_id, cmd and type.
   return device_id: The device_id
   return cmd: command from the device.
   return type: login_request, ping, etc.
   *******************************************/
  this.parse_data = function (data) {
    data = data.toString('hex');
    // data = data.toString();
    console.log(data);

    var parts = {
      'start': data.substr(0, 4)
    };

    if (parts['start'] == '7878') {
      parts['length'] = parseInt(data.substr(4, 2), 16);
      parts['finish'] = data.substr(6 + parts['length'] * 2, 4);

      parts['protocal_id'] = data.substr(6, 2);

      if (parts['finish'] != '0d0a') {
        throw 'finish code incorrect!';
      }

      if (parts['protocal_id'] == '01') {
        parts['device_id'] = data.substr(8, 16);
        parts.cmd = 'login_request';
        parts.action = 'login_request';
      } else if (parts['protocal_id'] == '12') {
        parts['device_id'] = '';
        parts['data'] = data.substr(8, parts['length'] * 2);
        parts.cmd = 'ping';
        parts.action = 'ping';
      } else if (parts['protocal_id'] == '13') {
        parts['device_id'] = '';
        parts['data'] = data.substr(8, parts['length'] * 2);
        parts.cmd = 'heartbeat';
        parts.action = 'heartbeat';
      } else if (parts['protocal_id'] == '15') {
        parts['device_id'] = '';
        parts['data'] = data.substr(8, parts['length'] * 2);
        parts.cmd = 'action';
        parts.action = 'action';
      } else if (parts['protocal_id'] == '16' || parts['protocal_id'] == '18') {
        parts['device_id'] = '';
        parts['data'] = data.substr(8, parts['length'] * 2);
        parts.cmd = 'alarm';
        parts.action = 'alarm';
      } else {
        parts['device_id'] = '';
        parts.cmd = 'noop';
        parts.action = 'noop';
      }
    } else {
      parts['device_id'] = '';
      parts.cmd = 'noop';
      parts.action = 'noop';
    }

    parts['full_data'] = data;
    console.log(parts);
    return parts;
  };
  this.authorize = function () {
    //this.device.send("\u0078\u0078\u0005\u0001\u0000\u0001\u00d9\u00dc\u000d\u000a");
    //return ;
    var length = '05';
    var protocal_id = '01';
    var serial = f.str_pad(this.__count, 4, 0);

    var str = length + protocal_id + serial;

    this.__count++;

    var crcResult = f.str_pad(crc.getCrc16(Buffer.from(str, 'hex')).toString(16), 4, '0');

    var buff = new Buffer('7878' + str + crcResult + '0d0a', 'hex');
    var buff = new Buffer('787805010001d9dc0d0a', 'hex');
    //发送原始数据
    this.device.send(buff);
  };
  this.zeroPad = function (nNum, nPad) {
    return ('' + (Math.pow(10, nPad) + nNum)).slice(1);
  };
  this.synchronous_clock = function (msg_parts) {

  };
  this.receive_heartbeat = function (msg_parts) {
    var str = msg_parts.data;

    var data = {
      'device_info': f.str_pad(parseInt(str.substr(0, 2), 16).toString(2), 8, 0),
      'power': this.dex_to_dec(str.substr(2, 2)),
      'gsm': this.dex_to_dec(str.substr(4, 2)),
      'alert': this.dex_to_dec(str.substr(6, 2)).toString() + this.dex_to_dec(str.substr(8, 2)).toString(),
    };

    data['power_status'] = this.dex_to_dec(data['device_info'][0]);
    data['gps_status'] = this.dex_to_dec(data['device_info'][1]);
    data['batery_status'] = data['device_info'][2] + data['device_info'][3] + data['device_info'][4];
    data['charge_status'] = this.dex_to_dec(data['device_info'][5]);
    data['acc_status'] = this.dex_to_dec(data['device_info'][6]);
    data['defence_status'] = this.dex_to_dec(data['device_info'][7]);

    return data;
  };
  this.run_other = function (cmd, msg_parts) {
  };

  this.request_login_to_device = function () {
    //@TODO: Implement this.
  };

  this.receive_alarm = function (msg_parts) {
    var str = msg_parts.data;

    var data = {
      'date': str.substr(0, 12),
      'set_count': this.dex_to_dec(str.substr(13, 1)),
      'latitude_raw': str.substr(14, 8),
      'longitude_raw': str.substr(22, 8),
      'latitude': 0 - this.dex_to_degrees(str.substr(14, 8)),
      'longitude': this.dex_to_degrees(str.substr(22, 8)),
      'speed': parseInt(str.substr(30, 2), 16),
      'orientation': str.substr(32, 4),
      'lbs': str.substr(36, 18),
      'device_info': f.str_pad(parseInt(str.substr(54, 2), 16).toString(2), 8, 0),
      'power': this.dex_to_dec(str.substr(56, 2)),
      'gsm': this.dex_to_dec(str.substr(58, 2)),
      'alert': this.dex_to_dec(str.substr(60, 2)).toString() + this.dex_to_dec(str.substr(62, 2)).toString(),
    };

    data['power_status'] = this.dex_to_dec(data['device_info'][0]);
    data['gps_status'] = this.dex_to_dec(data['device_info'][1]);
    data['batery_status'] = data['device_info'][2] + data['device_info'][3] + data['device_info'][4];
    data['charge_status'] = this.dex_to_dec(data['device_info'][5]);
    data['acc_status'] = this.dex_to_dec(data['device_info'][6]);
    data['defence_status'] = this.dex_to_dec(data['device_info'][7]);

    var year = this.dex_to_dec(data['date'].substring(0,2));
    var month = this.dex_to_dec(data['date'].substring(2,4));
    var day = this.dex_to_dec(data['date'].substring(4,6));
    var hour = this.dex_to_dec(data['date'].substring(6,8));
    var min = this.dex_to_dec(data['date'].substring(8,10));
    var sec = this.dex_to_dec(data['date'].substring(10,12));

    month = month < 10 ? "0" + month.toString() : month.toString()
    day = day < 10 ? "0" + day.toString() : day.toString()
    hour = hour < 10 ? "0" + hour.toString() : hour.toString()
    min = min < 10 ? "0" + min.toString() : min.toString()
    sec = sec < 10 ? "0" + sec.toString() : sec.toString()

    data['date'] = (2000 + year).toString() + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
    
    data['mcc'] = this.dex_to_dec(data['lbs'].substring(0,4));
    data['mnc'] = this.dex_to_dec(data['lbs'].substring(4,6));
    data['lac'] = this.dex_to_dec(data['lbs'].substring(6,10));
    data['cellid'] = this.dex_to_dec(data['lbs'].substring(10,16));

    var binaryOrientation1 = this.dex_to_bin(data.orientation.substring(0,2));
    var binaryOrientation2 = this.dex_to_bin(data.orientation.substring(2,4));
    var binaryOrientation = binaryOrientation1.toString() + binaryOrientation2.toString()

    data['angle'] = parseInt(binaryOrientation.substring(6,16), 2);

    return data;
  };

  this.receive_action = function (msg_parts) {
    var str = msg_parts.data;

    var length_command = str.substr(0, 2);
    var server_flag = str.substr(2, 8);

    var data = {
      'length_command'  : length_command,
      'server_flag'     : server_flag,
      'cmd_id'          : this.dex_to_dec(server_flag),
      'command_content' : str
    };

    return data;
  };

  this.dex_to_degrees = function (dex) {
    return parseInt(dex, 16) / 1800000;
  };

  this.dex_to_bin = function (dex) {
    return (parseInt(dex, 16).toString(2)).padStart(8, '0');
  }

  this.dex_to_dec = function (dex) {
    return parseInt(dex, 16);
  }

  this.dec_to_dex = function(dec) {
    var hex = parseInt(dec).toString(16);
    while (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
  }

  this.str_to_hex = function(str) {
      //converting string into buffer
      let bufStr = Buffer.from(str, 'utf8');

      //with buffer, you can convert it into hex with following code
      return bufStr.toString('hex');
  }

  this.get_ping_data = function (msg_parts) {
    console.log(msg_parts);
    var str = msg_parts.data;

    var data = {
      'date': str.substr(0, 12),
      'set_count': this.dex_to_dec(str.substr(13, 1)),
      'latitude_raw': str.substr(14, 8),
      'longitude_raw': str.substr(22, 8),
      'latitude': 0 - this.dex_to_degrees(str.substr(14, 8)),
      'longitude': this.dex_to_degrees(str.substr(22, 8)),
      'speed': parseInt(str.substr(30, 2), 16),
      'orientation': str.substr(32, 4),
      'lbs': str.substr(36, 16),
    };

    data['mcc'] = this.dex_to_dec(data['lbs'].substring(0,4));
    data['mnc'] = this.dex_to_dec(data['lbs'].substring(4,6));
    data['lac'] = this.dex_to_dec(data['lbs'].substring(6,10));
    data['cellid'] = this.dex_to_dec(data['lbs'].substring(10,16));

    var year = this.dex_to_dec(data['date'].substring(0,2));
    var month = this.dex_to_dec(data['date'].substring(2,4));
    var day = this.dex_to_dec(data['date'].substring(4,6));
    var hour = this.dex_to_dec(data['date'].substring(6,8));
    var min = this.dex_to_dec(data['date'].substring(8,10));
    var sec = this.dex_to_dec(data['date'].substring(10,12));

    month = month < 10 ? "0" + month.toString() : month.toString()
    day = day < 10 ? "0" + day.toString() : day.toString()
    hour = hour < 10 ? "0" + hour.toString() : hour.toString()
    min = min < 10 ? "0" + min.toString() : min.toString()
    sec = sec < 10 ? "0" + sec.toString() : sec.toString()

    data['date'] = (2000 + year).toString() + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;

    var binaryOrientation1 = this.dex_to_bin(data.orientation.substring(0,2));
    var binaryOrientation2 = this.dex_to_bin(data.orientation.substring(2,4));
    var binaryOrientation = binaryOrientation1.toString() + binaryOrientation2.toString()

    data['angle'] = parseInt(binaryOrientation.substring(6,16), 2);

    return data;
  };

  /* SET REFRESH TIME */
  this.set_refresh_time = function (interval, duration) {
  };

  this.get_command = function(id, cmd, type) {
    var start     = '7878';
    var end       = '0d0a';
    var protocol  = '80'
    
    // information content start
    var flag = f.str_pad(this.dec_to_dex(id), 8, 0);
    console.log('flag: ' + flag)

    var command = cmd;
    if(type == 'ascii') {
        command = this.str_to_hex(cmd)
    }
    console.log('command: ' + command)
    var length_command = this.dec_to_dex((flag.length + command.length)/2);
    console.log('length_command: ' + length_command)

    var information_content = length_command + flag + command;
    console.log('information_content: ' + information_content)
    
    var serial = f.str_pad(device.adapter.__count, 4, 0);
    console.log('serial: ' + serial)

    var length = this.dec_to_dex((protocol.length + information_content.length + serial.length + 4)/2);

    var str = length + protocol + information_content + serial;
    
    var crcResult = f.str_pad(crc.getCrc16(Buffer.from(str, 'hex')).toString(16), 4, '0');

    device.adapter.__count++;
    
    var msg = start + length + protocol + information_content + serial + crcResult + end;
    console.log('Prepare msg: ' + msg);
    var buff = Buffer.from(msg, 'hex');

    return buff;
  }

  this.get_response = function(action) {
    var start     = '7878';
    var end       = '0d0a';

    var protocol = '';
    if(action = 'heartbeat') {
      protocol = '13';
    } else {
      return undefined;
    }

    var serial = f.str_pad(device.adapter.__count, 4, 0);
    console.log('serial: ' + serial)

    var length = this.dec_to_dex((protocol.length + serial.length + 4)/2);

    var str = length + protocol + serial;
    
    var crcResult = f.str_pad(crc.getCrc16(Buffer.from(str, 'hex')).toString(16), 4, '0');

    device.adapter.__count++;
    
    var msg = start + length + protocol + serial + crcResult + end;
    console.log('Prepare msg: ' + msg);
    var buff = Buffer.from(msg, 'hex');

    return buff;
  }
};

exports.adapter = adapter;