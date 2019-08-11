/*
 * Real Time Public Transport Monitor
 */

"use strict";
const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Soup = imports.gi.Soup;
const Lang = imports.lang;
const Settings = imports.ui.settings;
const Mainloop = imports.mainloop;
const Gettext = imports.gettext;
const uuid = "RealTimePublicTransportMonitor@f-istvan";
const Json = imports.gi.Json;

var session = new Soup.SessionAsync();

function _(str) {
  return Gettext.dgettext(uuid, str);
}

function RealTimePublicTransportMonitor(metadata, deskletId) {
    this._init(metadata, deskletId);
}

let createLabel = function(label, cssClass) {
  return new St.Label({
    text: label,
    styleClass: cssClass
  });
};

let createMainLayoutWithItems = function (config) {
  let _window = new St.BoxLayout({
    vertical: true,
    width: config.width,
    height: config.height,
    styleClass: "monitor-window"
  });

  config.items.forEach((item) => _window.add(item));
  return _window;
};

let getDateText = function () {
  let now = new Date();
  return "Last update: " +
    now.getFullYear() +
    "-" + (now.getMonth() + 1) +
    "-" + now.getDate() +
    " " + now.getHours() +
    ":" + now.getMinutes() +
    ":" + now.getSeconds();
};

RealTimePublicTransportMonitor.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init(metadata, deskletId) {
        Desklet.Desklet.prototype._init.call(this, metadata, deskletId);

        this.settings = new Settings.DeskletSettings(this, this.metadata.uuid, deskletId);
        this.settings.bindProperty(Settings.BindingDirection.IN, "height", "height", this.onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "width", "width", this.onSettingsChanged, null);

        let config = {
          height: this.height,
          width: this.width,
          items: [
            createLabel("Loading...", "")
          ]
        };

        this.window = createMainLayoutWithItems(config);
        this.setContent(this.window);
        this.getMonitor();
    },

    handleResponse(session, message) {

      global.log("------------------")

      var data = JSON.parse(message.response_body.data).data

      global.log(data)

      var filters = [
        {
          name: "52",
          rbl: 1535
        },
        {
          name: "57A",
          rbl: 1583
        }
      ]

      //var trafficInfo = getTrafficInfo()
      var monitor = data.monitors[0]
      var stopName = monitor.locationStop.properties.title
      var line = monitor.lines[0]
      var lineName = line.name
      var lineTowards = line.towards
      var trafficJam = line.trafficjam

      var departureTime = line.departures.departure[0].departureTime
      var timePlanned = departureTime.timePlanned
      var timeReal = departureTime.timeReal
      var countdown = departureTime.countdown.toString()
      global.log(line)



      let config = {
        height: this.height,
        width: this.width,
        items: [
          createLabel(stopName + ' - ' + lineName, "monitor-title"),
          createLabel('Im Richtung: ' + lineTowards, "monitor-title"),
          createLabel(getDateText(), "monitor-last-modified"),
          createLabel('Next bus: ' + countdown + ' minutes', "monitor-title")
        ]
      };

      this.window = createMainLayoutWithItems(config);

      this.setContent(this.window);
      this.mainloop = Mainloop.timeout_add(10 * 1000, Lang.bind(this, this.getMonitor));
    },

    getMonitor() {
      var secretApiKey = "<read from property>"

      // how to get more rbl in one call
      //var url = "http://www.wienerlinien.at/ogd_realtime/monitor?rbl=1583&rbl=1535&activateTrafficInfo=stoerungkurz&activateTrafficInfo=stoerunglang&activateTrafficInfo=aufzugsinfo&sender=";
      var url = "http://www.wienerlinien.at/ogd_realtime/monitor?rbl=1583&activateTrafficInfo=stoerungkurz&activateTrafficInfo=stoerunglang&activateTrafficInfo=aufzugsinfo&sender=";
      var url = url + secretApiKey

      var getUrl = Soup.Message.new("GET", url);
      session.queue_message(getUrl, Lang.bind(this, this.handleResponse));
    },

    onSettingsChanged() {
      this.window.set_size(this.width, this.height);
    },

    /**
     * Called when the desklet is removed.
     */
    on_desklet_removed() {
      this.window.destroy_all_children();
      this.window.destroy();
      Mainloop.source_remove(this.mainloop);
    }
};

function main(metadata, deskletId) {
    return new RealTimePublicTransportMonitor(metadata, deskletId);
}

