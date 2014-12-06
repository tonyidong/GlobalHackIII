var Sensi = Sensi || {};

Sensi.session = function() {
    var self = this;
    var onThermostatChange, beforeThermostatChange;

    self.UserName = ko.observable();
    self.Password = ko.observable();
    self.Authenticated = ko.observable(false);
    self.Thermostats = ko.observableArray();
    self.CurrentThermostat = ko.observable();
    self.HasMultipleStats = ko.computed(function() {
        return self.Thermostats().length > 1;
    });
    self.AccountSettings = new Sensi.accountSettings();
    self.Notifications = ko.observableArray();
    self.AdvancedScheduling = ko.observable().extend({ localStorage: 'AdvancedScheduling' });
    
    self.CurrentPage = function() {
        return self.Authenticated() ? "controls" : "login";
    };

    self.SettingsPage = ko.observable('blank');

    self.ChangeSettingsPage = function(_, event) {
        event.preventDefault();
        self.SettingsPage($(event.target).attr('href'));
    };

    self.ThermostatState = function() {
        if (self.Thermostats().length === 0)
            return "no-thermostats";
        return self.CurrentThermostat().State();
    };

    self.ThermostatRunningMode = ko.computed(function() {
        var thisThermostat = self.CurrentThermostat();

        if (!thisThermostat) {
            return { 'stable': true, 'heating': false, 'cooling': false };
        }

        var runningMode = Sensi.ConvertAux(thisThermostat.RunningMode());
        if (runningMode !== 'Off')
            return { 'cooling': runningMode == 'Cool', 'heating': runningMode == 'Heat', 'stable': false };
        
        var setpoints = thisThermostat.Setpoints;
        var systemMode = Sensi.ConvertAux(thisThermostat.SystemMode());
        var temperature = thisThermostat.Temperature();

        var heating = systemMode == 'Heat' && temperature < setpoints.Heat();
        var cooling = systemMode == 'Cool' && temperature > setpoints.Cool();
        var autoCool = systemMode == 'Auto' && temperature > setpoints.AutoCool();
        var autoHeat = systemMode == 'Auto' && temperature < setpoints.AutoHeat();
        
        return {
            'cooling': (cooling || autoCool),
            'heating': (heating || autoHeat),
            'stable': !(heating || cooling || autoCool || autoHeat)
        };
    });

    self.IsCurrentThermostatOnline = ko.computed(function() {
        var thisThermostat = self.CurrentThermostat();
        if (thisThermostat) {
            return thisThermostat.State() === Sensi.ThermostatState.Online;
        }
        return false;
    });

    self.IsPasswordResetRequired = ko.computed({
        read: function() {
            return self.AccountSettings.ChangePasswordModel.PasswordResetRequired();
        },
        write: function(value) {
            self.AccountSettings.ChangePasswordModel.PasswordResetRequired(value);
        }
    });

    self.PageLoad = function() {
        switch (self.CurrentPage()) {
        case "login":
            Sensi.Ui.LoadLoginPage();
            break;
        case "controls":
            Sensi.Ui.LoadControlsPage();
            break;
        default:
            break;
        }
    };
    
    self.Login = function() {
        Sensi.Login(self.UserName(), self.Password())
            .always(self.BlankoutPassword)
            .then(self.OnLoggedIn)
            .then(self.GetThermostatList)
            .then(self.OnListRetrieved)
            .fail(self.LoginFailed);
    };
    
    self.BlankoutPassword = function() {
        self.Password("");
    };
    self.OnLoggedIn = function(authResponse) {
        self.SettingsPage = ko.observable(''); //TODO: restore default tab
        self.IsPasswordResetRequired(authResponse.PasswordResetRequired);
        self.Notifications([]);
        self.AccountSettings.ChangePasswordModel.Notifications([]);
    };

    self.OnListRetrieved = function() {
        if (self.Thermostats().length > 0) {
            self.CurrentThermostat(self.Thermostats()[0]);
        }
        self.Authenticated(true);

        return Sensi.Connect()
            .done(function () {
                Sensi.Subscribe(self.CurrentThermostat());
                onThermostatChange = self.CurrentThermostat.subscribe(Sensi.Subscribe);
                beforeThermostatChange = self.CurrentThermostat.subscribe(Sensi.Unsubscribe, null, "beforeChange");
            });
    };
    
    self.ResetPassword = function() {
        Sensi.ResetPassword(self.UserName())
            .always(function() { self.Notifications([]); })
            .done(function() {
            self.Notifications.push(Message('Your new password has been sent to your email.'));
            $('[href=#user-login]').tab('show');
        })
            .fail(function() {
                self.Notifications.push(Error("The email address you entered is invalid. Please Try Again."));
        });
    };
    
    self.LoginFailed = function() {
        self.Notifications([Error('Login failed.')]);
    };
       
    self.Logout = function() {
        sessionStorage.clear();
        self.Dispose();
        Sensi.Logout();
    };

    self.Reconnect = function() {
        Sensi.InitializeTimezones();
        self.GetThermostatList()
            .then(Sensi.Connect)
            .then(self.OnListRetrieved);
    };

    $(Sensi).bind('nack', function() {
        self.Notifications.push(Error('Unable to save changes, please try again.'));
    });

    self.Dispose = function () {
        onThermostatChange && onThermostatChange.dispose();
        beforeThermostatChange && beforeThermostatChange.dispose();
        self.UserName('');
        self.Authenticated(false);
        self.Thermostats([]);
        self.CurrentThermostat(undefined);
    };

    setInterval(function() {
        $(self.Thermostats()).each(function(_, thermostat) {
            Sensi.GetThermostatWeather(thermostat.ICD)
                 .done(function (data) {
                     thermostat.Weather.Update(data);
        });
        });
    }, 3600000);

    self.GetThermostatList = function () {
        return Sensi.GetThermostatList()
            .done(function (data) {
                var tstatList = new Array();
                $(data).each(function (_, tstatInfo) {
                    var tstat = new Sensi.viewModel(tstatInfo);

                    Sensi.GetThermostatWeather(tstatInfo.ICD)
                         .done(tstat.UpdateWeather);

                    if (tstatInfo.ContractorId) {
                        Sensi.GetThermostatContractor(tstatInfo.ContractorId)
                             .done(tstat.SetContractor);
                    }
                        
                    tstatList.push(tstat);
                });
                Sensi.log(data);
                self.Thermostats(tstatList);
            });
    };

    self.DaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    self.getCopyrightInfo = function () {
        now = new Date;
        theYear = now.getYear();
        if (theYear < 1900)
            theYear = theYear + 1900;

        var copyright = "Copyright &copy; " + theYear + " Emerson Electric Co. All rights reserved.";
        return copyright;
    };
};

function Message(message) {
    return new Notification('message', message);
}

function Alert(message) {
    return new Notification('alert', message);
}

function Error(message) {
    return new Notification('error', message);
}

function Notification(type, message) {
    this.Type = type;
    this.Message = message;
}