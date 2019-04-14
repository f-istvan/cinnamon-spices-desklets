/*
 * Vienna Weather Information
 */
const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Soup = imports.gi.Soup;
const Lang = imports.lang;
const Settings = imports.ui.settings;
const Mainloop = imports.mainloop;
const Gettext = imports.gettext;
const uuid = "ViennaTextBasedWeather@f-istvan";

var session = new Soup.SessionAsync();

function _(str) {
  return Gettext.dgettext(uuid, str);
}

function ViennaTextBasedWeather(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

String.prototype.replaceAt = function(index, replacement) {
  return [this.slice(0, index), replacement, this.slice(index)].join('')
}

let insertNewLines = function(text) {
  let numOfCharsToSkip = 80
  for (let i = 1; i < text.length / numOfCharsToSkip; i++) {
    var position = text.indexOf(' ', numOfCharsToSkip * i) + 1
    text = text.replaceAt(position, '\n');
  }

  return text;
}

let getWeatherObjectByRegex = function(text, regex) {
  let match = text.match(regex)
  let weatherLabel = match[1]
  let weatherText = match[2]
    .toString()
    .trim()
    .replace(/<\/?p>/g, '')

  return {
    name: weatherLabel,
    text: weatherText
  }

}

let createLabel = function(label, cssClass) {
  return new St.Label({
    text: label,
    style_class: cssClass
  });
}

let createWeatherContainer = function (weatherObject) {
  let heuteWeatherName = createLabel(weatherObject.name, 'vie-weather-name')
  let text = insertNewLines(weatherObject.text)
  let heuteWeatherText = createLabel(text, 'vie-weather-text')
  
  let widgetLayout = new St.BoxLayout({
    vertical: true,
    style_class: 'vie-weather-container'
  });  

  widgetLayout.add(heuteWeatherName);
  widgetLayout.add(heuteWeatherText);

  return widgetLayout
}

let createMainLayoutWithItems = function (config) {
  let window = new St.BoxLayout({
    vertical: true,
    width: config.width,
    height: config.height,
    style_class: 'vie-window'
  });

  config.items.forEach(item => window.add(item))
  return window
}

let getDateText = function () {
  let now = new Date()
  return 'Last weather update: ' + 
    now.getFullYear() + 
    "-" + (now.getMonth() + 1) + 
    "-" + now.getDate() + 
    " " + now.getHours() + 
    ":" + now.getMinutes() +
    ":" + now.getSeconds()
}

ViennaTextBasedWeather.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this.settings = new Settings.DeskletSettings(this, this.metadata.uuid, desklet_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "height", "height", this._onDisplayChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "width", "width", this._onDisplayChanged, null);
        
        let config = {
          height: this.height,
          width: this.width,
          items: [
            createLabel('Loading...', 'vie-weather-label')
          ]
        }

        this.window = createMainLayoutWithItems(config)
        this.setContent(this.window)
        this.getWeather();
    },

    _onResponse: function(session, message) {
      let fulltextWrapper = message.response_body.data.toString();
      
      let heuteRegex = /<h2>(Heute[^]*)<\/h2>[^]*(<p>[^]*<\/p>)<h2>Morgen+/
      let morgenRegex = /<h2>(Morgen[^]*)<\/h2>([^]*<p>[^]*<\/p>)<h2>Übermorgen/
      let uberMorgenRegex = /<h2>(Übermorgen[^]*)<\/h2>([^]*<p>[^]*<\/p>)<h2>/

      let heuteWeather = getWeatherObjectByRegex(fulltextWrapper, heuteRegex)
      let morgenWeather = getWeatherObjectByRegex(fulltextWrapper, morgenRegex)
      let uberMorgenWeather = getWeatherObjectByRegex(fulltextWrapper, uberMorgenRegex)

      let config = {
        height: this.height,
        width: this.width,
        items: [
          createLabel('Wien Wetter', 'vie-title'),
          createLabel(getDateText(), 'vie-last-modified'),
          createWeatherContainer(heuteWeather),
          createWeatherContainer(morgenWeather),
          createWeatherContainer(uberMorgenWeather)
        ]
      }

      this.window = createMainLayoutWithItems(config)

      this.setContent(this.window)
      this.mainloop = Mainloop.timeout_add(10 * 1000, Lang.bind(this, this.getWeather));
    },

    getWeather: function() {
      var url = 'https://wetter.orf.at/wien/prognose';
      var getUrl = Soup.Message.new('GET', url);
      session.queue_message(getUrl, Lang.bind(this, this._onResponse));
    },

    _onDisplayChanged : function() {
        this.window.set_size(this.width, this.height);
    },

    _onSettingsChanged : function() {
        Mainloop.source_remove(this.mainloop);
        this.getWeather();
    },

    on_desklet_remove: function() {
      this.window.destroy_all_children();
      this.window.destroy();
      Mainloop.source_remove(this.mainloop);
    }
};

function main(metadata, desklet_id) {
    return new ViennaTextBasedWeather(metadata, desklet_id);
}

