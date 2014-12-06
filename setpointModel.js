var Sensi = Sensi || {};

Sensi.Setpoint = function (spec, options) {
    var that = {
        Time: ko.observable(spec.Time).extend({ time: true }),
        Heat: ko.observable(spec.Heat).extend({ temperature: options.degrees}),
        Cool: ko.observable(spec.Cool).extend({ temperature: options.degrees})
    };

    return that;
};

Sensi.EditableSetpoint = function(spec, options) {
    var that = new Sensi.Setpoint(spec, options);
    var heatLimit = options.limits.Heat;
    var coolLimit = options.limits.Cool;
    
    if (options.type === 'Auto') {
        heatLimit = options.limits.AutoHeat;
        coolLimit = options.limits.AutoCool;
        that.Heat.extend({ deadband: { type: 'Heat', setpoint: that.Cool, deadband: options.deadband } });
        that.Cool.extend({ deadband: { type: 'Cool', setpoint: that.Heat, deadband: options.deadband } });
    }
    
    that.Type = options.type;
    that.Time.extend({ trackable: true });
    that.Heat.extend({ trackableTemperature: options.degrees, limited: heatLimit });
    that.Cool.extend({ trackableTemperature: options.degrees, limited: coolLimit });
    
    that.commit = function () {
        that.Time.commit();
        that.Heat.commit();
        that.Cool.commit();
    };
    that.reset = function () {
        that.Time.reset();
        that.Heat.reset();
        that.Cool.reset();
    };
    that.save = function() {
        that.commit();
        options.save();
    };

    return that;
};