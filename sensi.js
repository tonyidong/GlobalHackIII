var Sensi = Sensi || {};
Sensi.Server = $.connection.thermostat.server;
Sensi.Client = $.connection.thermostat.client;
Sensi.Hub = $.connection.hub;
Sensi.Accept = 'application/json; version=1';

//Endpoints
Sensi.AuthorizeEndpoint = Sensi.Config.Api + 'authorize';
Sensi.UpdateEmailEndpoint = Sensi.Config.Api + 'account/email';
Sensi.CreateAccountEndpoint = Sensi.Config.Api + 'account';
Sensi.UpdatePasswordEndpoint = Sensi.Config.Api + 'account/password';
Sensi.ResetPasswordEndpoint = Sensi.Config.Api + 'account/resetpassword';
Sensi.ThermostatsEndpoint = Sensi.Config.Api + 'thermostats';
Sensi.UpdateThermostatEndpoint = Sensi.Config.Api + 'thermostats';
Sensi.WeatherEndpoint = Sensi.Config.Api + 'weather';
Sensi.GetTimezonesEndpoint = Sensi.Config.Api + 'timezones';
Sensi.GetPostalCodeEndpoint = Sensi.Config.Api + 'postalcode';
Sensi.GetThermostatContractorEndpoint = Sensi.Config.Api + 'contractors';

Sensi.TimeZones = ko.observable({});
Sensi.Countries = [{ value: 'US', text: 'USA' }, { value: 'CA', text: 'CANADA' }];

Sensi.Setup = function () {
    Sensi.Session = new Sensi.session();

    $.ajaxSetup({
        xhrFields: { withCredentials: true },
        accepts: {
            text: Sensi.Accept,
            json: Sensi.Accept,
            '__flxhr__': Sensi.Accept
        },
    });

    Sensi.Hub.error(Sensi.ConnectionError);
    Sensi.Hub.disconnected(Sensi.Disconnected);
    
    
    Sensi.Client.online = function (icd, model) {
        Sensi.log(icd);
        Sensi.log(model);
        
        var currentThermostat = Sensi.Session.CurrentThermostat();
        if (icd == currentThermostat.ICD) {
            currentThermostat.Online(model);
        }
    };
    Sensi.Client.update = function (icd, model) {
        var currentThermostat = Sensi.Session.CurrentThermostat();
        if (icd == currentThermostat.ICD) {
            Sensi.log(model);
            currentThermostat.Update(model);
        }
    };
    Sensi.Client.offline = function (icd) {
        var currentThermostat = Sensi.Session.CurrentThermostat();
        if (icd == currentThermostat.ICD) {
            currentThermostat.Offline();
        }
    };
    Sensi.Client.error = function (icd, model) {
        var currentThermostat = Sensi.Session.CurrentThermostat();

        if (icd == currentThermostat.ICD) {
            currentThermostat.Update(model);
            $(Sensi).trigger('nack');
        }
    };
    
    Sensi.Session.Reconnect();
    
    ko.applyBindings(Sensi.Session);
};

Sensi.Login = function (username, password) {
    return $.ajax({
        type: "POST",
        contentType: 'application/json',
        headers: { "X-Requested-With": "XMLHttpRequest" },
        dataType: 'json',
        url: Sensi.AuthorizeEndpoint,
        data: JSON.stringify({ UserName: username, Password: password })
    })
    .fail(function(ajax, error, errorMessage) {
        Sensi.log(errorMessage);
    });
};

Sensi.InitializeTimezones = function () {
    $.each(Sensi.Countries, function (_, kvp) {
        Sensi.GetTimezonesByCountry(kvp.value)
            .done(function (data) {
                var timeZones = Sensi.TimeZones();

                var zones = new Array();

                $.each(data, function (k, v) {
                    zones.push({ value: k, text: v });
                });

                timeZones[kvp.value] = zones;
                
                Sensi.TimeZones(timeZones);
            });
    });
};

Sensi.Logout = function () {
    Sensi.Hub.stop();

    return Sensi.JsonRequest("DELETE", Sensi.AuthorizeEndpoint);
};

Sensi.GetThermostatList = function() {
    Sensi.log("Retreiving Thermostats");
    return Sensi.JsonRequest("GET", Sensi.ThermostatsEndpoint)
        .fail(function (ajax, error, errorMessage) { Sensi.log(errorMessage); });
};

Sensi.GetThermostatWeather = function(icd) {
    var weatherUrl = Sensi.WeatherEndpoint + '/' + icd;
    return Sensi.JsonRequest("GET", weatherUrl);
};

Sensi.GetThermostatContractor = function(contractorId) {
    var contractorUrl = Sensi.GetThermostatContractorEndpoint + '/' + contractorId;

    return Sensi.JsonRequest("GET", contractorUrl);
};

Sensi.Connect = function() {
    return Sensi.Hub.start()
        .fail(function() {
            Sensi.log("Could not connect to Server.");
        });
};

Sensi.Subscribe = function (thermostat) {
    if (!thermostat) return;

    Sensi.log("Subscribing to " + thermostat.ICD);
    Sensi.Server.subscribe(thermostat.ICD);
};

Sensi.Unsubscribe = function(thermostat) {
    if (!thermostat) return;

    try {
        Sensi.log("Unsubscribing from " + thermostat.ICD);
        Sensi.Server.unsubscribe(thermostat.ICD);
        thermostat.State(Sensi.ThermostatState.Connecting);
    } catch (e) {
        Sensi.log("Unable to unsubscribe");
    } 
};

Sensi.ChangePassword = function (oldPassword, newPassword) {
    return Sensi.JsonRequest("PUT",
        Sensi.UpdatePasswordEndpoint,
        { Password: oldPassword, NewPassword: newPassword }
    );
};

Sensi.ChangeEmail = function (email, password) {
    return Sensi.JsonRequest("PUT",
        Sensi.UpdateEmailEndpoint,
        { NewEmail: email, Password: password });
};

Sensi.CreateAccount = function (email, password) {
    return Sensi.JsonRequest("POST",
        Sensi.CreateAccountEndpoint,
        { UserName: email, Password: password },
        'text'
    );
};

Sensi.UpdateThermostatSummary = function (icd, contractorId, deviceName, zipCode, country, timeZone) {
    return Sensi.JsonRequest("PUT",
      Sensi.UpdateThermostatEndpoint,
      { Icd: icd, PostalCode: zipCode, CountryCode: country, DeviceName: deviceName, ContractorId: contractorId, TimeZone: timeZone });
};

Sensi.ResetPassword = function(email) {
    return Sensi.JsonRequest("PUT",
        Sensi.ResetPasswordEndpoint,
        { UserName: email });
};

Sensi.GetTimezonesByCountry = function(countryCode) {
    return Sensi.JsonRequest("GET",
        Sensi.GetTimezonesEndpoint + '/' + countryCode);
};

Sensi.NotificationType = function (notification) {
    return notification.Type;
};

Sensi.TimelineType = function (timeline, context) {
    if (context.$index() == 0 && !Array.isArray(context.$parent))
        return 'current';
    if (Array.isArray(timeline))
        return "multi";
    if (!timeline.Time)
        return "empty";
    if (timeline.Heat() !== undefined && timeline.Cool() !== undefined)
        return "auto";
    if (timeline.Cool() !== undefined)
        return "cool";

    return "heat";
};

Sensi.JsonRequest = function(method, url, payload, type) {
    var dataType = type ? type : 'json';
    var data = payload ? JSON.stringify(payload) : undefined;
    var request = Sensi.flXHR ? url + '?Accept=' + Sensi.Accept : url;

    return $.ajax({
        url: request,
        data: data,
        type: method,
        contentType: 'application/json',
        dataType: dataType
    });
};

Sensi.ConnectionError = function() {
    Sensi.log("Connection Error....");
    Sensi.Hub.stop();
    Sensi.Session.Dispose();
};

Sensi.Disconnected = function() {
    if (Sensi.Session.CurrentThermostat()) {
        Sensi.log('Disconnected');
        Sensi.Session.CurrentThermostat().State(Sensi.ThermostatState.Connecting);
        setTimeout(function() {
            Sensi.Connect()
                .done(function() {
                    Sensi.Subscribe(Sensi.Session.CurrentThermostat());
                });
        }, 1000);
    }
};

Sensi.ConvertAux = function (mode) {
    return mode == 'Aux' ? 'Heat' : mode;
};

Sensi.TempChange = {
    Interval: 125,
    SlowInterval: 500,
    Delay: 3000
};

Sensi.RapidTempChange = function (elapsedIntervals) {
    var milliseconds = ((elapsedIntervals - 1) * Sensi.TempChange.Interval);

    if (milliseconds < Sensi.TempChange.Delay)
        return milliseconds %  Sensi.TempChange.SlowInterval == 0;

    return true;
};

Sensi.log = function(data) {
    window.console && window.console.log(data);
};