var Sensi = Sensi || {};

Sensi.viewModel = function(summaryInfo) {
    var self = this;
    self.ICD = summaryInfo.ICD;
    self.State = ko.observable(Sensi.ThermostatState.Connecting);
    
    self.allAdvancedSettings = ['AuxCycleRate',
                                'ComfortRecovery',
                                'CompressorLockout',
                                'CoolCycleRate',
                                'FastSecondStageAux',
                                'FastSecondStageCool',
                                'FastSecondStageHeat',
                                'HeatCycleRate',
                                'TemperatureOffset',
                                'ContinuousBacklight',
                                'LocalHumidityDisplay',
                                'LocalTimeDisplay'];
    
    self.buildSettingObservable = function(settingName, defaultValue) {
        var ob = ko.observable(defaultValue)
            .extend({
                serverMethod: function(newValue) {
                    return Sensi.Server.changeSetting(self.ICD, settingName, newValue);
                }
            });
        return ob;
    };
  
    self.buildTemperatureObservable = function(t) {
        var ob = ko.observable()
                   .extend({ temperature: self.DegreeSetting });

        return ob;
    };
    
    self.buildSetpointObserable = function(serverCallback, limits) {
        var ob = self.buildTemperatureObservable()
                     .extend({
                                serverMethod: function (temperature) {
                                    return serverCallback(self.ICD, temperature, self.DegreeSetting());
                                },
                                limited: limits
                            });
        ob.EqualsAmbient = ko.computed(function() {
            return ob() === self.Temperature();
        });

        return ob;
    };
    
    $.each(self.allAdvancedSettings, function(_, setting) {
        self[setting] = self.buildSettingObservable(setting);
    });

    self.Weather = new Sensi.weatherModel();
    self.UpdateWeather = self.Weather.Update;

    self.Info = new thermostatInfoModel();
    self.Summary = new Sensi.thermostatSummaryModel(summaryInfo, self.Weather.Update);
    self.SetContractor = self.Summary.SetContractor;

    self.DegreeSetting = self.buildSettingObservable('Degrees', 'F');
    self.AutoModeDeadband = ko.observable(2);
    self.TemperatureOffsetLimits = { Min: 0, Max: 0 };

    self.Temperature = self.buildTemperatureObservable();
    self.FanMode = ko.observable().extend({ serverMethod: function(fanMode) { return Sensi.Server.setFanMode(self.ICD, fanMode); } });
    self.HoldMode = ko.observable().extend({ serverMethod: function(holdMode) { return Sensi.Server.setHoldMode(self.ICD, holdMode); } });
    self.SystemMode = ko.observable("Off").extend({ serverMethod: function(systemMode) { return Sensi.Server.setSystemMode(self.ICD, systemMode); } });
    self.ScheduleMode = ko.observable().extend({ serverMethod: function(scheduleMode) { return Sensi.Server.setScheduleMode(self.ICD, scheduleMode); } });
    self.OperatingMode = ko.observable();
    self.Humidity = ko.observable();
    self.LowPower = ko.observable(false);
    self.RunningMode = ko.observable();
    self.MaxStepsPerDay = ko.observable();

    self.SetpointLimits = {
        Heat: {
            Min: self.buildTemperatureObservable(),
            Max: self.buildTemperatureObservable()
        },
        Cool: {
            Min: self.buildTemperatureObservable(),
            Max: self.buildTemperatureObservable()
        }
    };
    self.SetpointLimits.AutoCool = {
        Min: ko.computed(function () { return Math.max(self.SetpointLimits.Cool.Min(), self.SetpointLimits.Heat.Min() + self.AutoModeDeadband()); }),
        Max: ko.computed(function () { return self.SetpointLimits.Cool.Max(); })
    };
    self.SetpointLimits.AutoHeat = {
        Min: ko.computed(function () { return self.SetpointLimits.Heat.Min(); }),
        Max: ko.computed(function () { return Math.min(self.SetpointLimits.Heat.Max(), self.SetpointLimits.Cool.Max() - self.AutoModeDeadband()); })
    };
    
    self.Schedules = new Sensi.thermostatSchedules(self.ICD, self.DegreeSetting, self.SetpointLimits, self.SystemMode, self.AutoModeDeadband, self.MaxStepsPerDay);

    self.Setpoints = {
        Heat: self.buildSetpointObserable(Sensi.Server.setHeat, self.SetpointLimits.Heat),
        Cool: self.buildSetpointObserable(Sensi.Server.setCool, self.SetpointLimits.Cool),
        AutoHeat: self.buildSetpointObserable(Sensi.Server.setAutoHeat, self.SetpointLimits.AutoHeat),
        AutoCool: self.buildSetpointObserable(Sensi.Server.setAutoCool, self.SetpointLimits.AutoCool),
                };

    self.Setpoints.AutoHeat.extend({ deadband: { type: 'Heat', setpoint: self.Setpoints.AutoCool, deadband: self.AutoModeDeadband } });
    self.Setpoints.AutoCool.extend({ deadband: { type: 'Cool', setpoint: self.Setpoints.AutoHeat, deadband: self.AutoModeDeadband } });

    self.SetpointTemplate = ko.computed(function() {
        return Sensi.ConvertAux(self.SystemMode()) + '-setpoint';
    });
    
    self.CapableModes = ko.observableArray();
    self.Supports = function(mode) {
        return self.CapableModes.indexOf(mode) !== -1;
    };

    self.HeatCycleRates = ko.observableArray();
    self.CoolCycleRates = ko.observableArray();
    self.AuxCycleRates = ko.observableArray();
    self.CapableFanModes = ko.observableArray(["Auto", "On"]);
    self.BoostCapable = ko.computed(function() {
        return self.FastSecondStageAux() !== undefined || self.FastSecondStageCool() !== undefined || self.FastSecondStageHeat() !== undefined;
    });
    self.CycleRateCapable = ko.computed(function() {
        return self.HeatCycleRate() !== undefined || self.CoolCycleRate() !== undefined || self.AuxCycleRate() !== undefined;
    });
    self.ThermostatDisplayCapable = ko.computed(function() {
        return self.LocalHumidityDisplay() !== undefined || self.LocalTimeDisplay() !== undefined;
    });
    self.TemperatureOffsetCapable = ko.computed(function() {
        return self.TemperatureOffset() !== undefined;
    });
    self.ComfortRecoveryCapable = ko.computed(function () {
        return self.ComfortRecovery() !== undefined;
    });
   
    
    self.StatusDisplay = ko.computed(function () {
        
        if (self.ScheduleMode() === 'Off') {
            return self.SystemMode() === 'Off' ? '' : 'Hold';
        }

        if (self.HoldMode() === 'Temporary')
            return 'Temporary Hold';

        var schedule = self.Schedules.getRunningSchedule();
       
        return (schedule) ? 'Schedule: ' +  schedule.Name.committedValue() : '';
    });

    self.Online = function(model) {
        self.State(Sensi.ThermostatState.Online);
        self.Info.Initialize(model.Capabilities, model.Product);
        self.UpdateCapabilities(model.Capabilities);
        self.Update(model);
    };

    self.Offline = function() {
        self.State(Sensi.ThermostatState.Offline);
    };

    self.Update = function(model) {
        self.UpdateSettings(model.Settings);
        self.UpdateOperationalStatus(model.OperationalStatus);
        self.UpdateEnvironmentControls(model.EnvironmentControls);
        self.Schedules.UpdateSchedules(model.Schedule);
        self.Info.Update(model.OperationalStatus);
    };

    self.UpdateSettings = function(model) {
        if (!model) return;
        
        if (model.Degrees)
            self.DegreeSetting.fromServer(model.Degrees);
        
        if (model.AutoModeDeadband)
            self.AutoModeDeadband(model.AutoModeDeadband);

        $.each(self.allAdvancedSettings, function(_, setting) {
            if (typeof model[setting] !== "undefined") {
                self[setting].fromServer(model[setting]);
            }
        });
    };

    self.UpdateOperationalStatus = function(model) {
        if (!model) return;

        if (model.Temperature)
            self.Temperature(model.Temperature);

        if (model.OperatingMode)
            self.OperatingMode(model.OperatingMode);

        if (model.Running)
            self.RunningMode(model.Running.Mode);

        if (model.Humidity)
            self.Humidity(model.Humidity);

        if (model.LowPower !== undefined)
            self.LowPower(model.LowPower);
    };

    self.UpdateCapabilities = function(model) {
        if (!model) return;

        self.CapableModes(model.SystemModes);
        
        if (model.TemperatureOffset)
            self.TemperatureOffsetLimits = model.TemperatureOffset;

        if (model.HeatLimits) {
            self.SetpointLimits.Heat.Min(model.HeatLimits.Min);
            self.SetpointLimits.Heat.Max(model.HeatLimits.Max);
        }
        if (model.CoolLimits) {
            self.SetpointLimits.Cool.Min(model.CoolLimits.Min);
            self.SetpointLimits.Cool.Max(model.CoolLimits.Max);
        }

        if (model.HeatCycleRates)
            self.HeatCycleRates(model.HeatCycleRates);
        if (model.CoolCycleRates)
            self.CoolCycleRates(model.CoolCycleRates);
        if (model.AuxCycleRates)
            self.AuxCycleRates(model.AuxCycleRates);
        if (model.Scheduling)
            self.MaxStepsPerDay(model.Scheduling.MaxStepsPerDay);

    };

    self.UpdateEnvironmentControls = function(model) {
        if (!model) return;

        if (model.SystemMode)
            self.SystemMode.fromServer(model.SystemMode);

        if (model.ScheduleMode)
            self.ScheduleMode.fromServer(model.ScheduleMode);

        if (model.FanMode)
            self.FanMode.fromServer(model.FanMode);

        if (model.HeatSetpoint) {
            self.Setpoints.Heat.fromServer(model.HeatSetpoint);
            self.Setpoints.AutoHeat.fromServer(model.HeatSetpoint);
        }

        if (model.CoolSetpoint) {
            self.Setpoints.Cool.fromServer(model.CoolSetpoint);
            self.Setpoints.AutoCool.fromServer(model.CoolSetpoint);
        }

        if (model.HoldMode)
            self.HoldMode.fromServer(model.HoldMode);
    };
};