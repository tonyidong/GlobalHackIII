var Sensi = Sensi || {};

Sensi.dayGroup = function (spec, options) {
    var self = this;
    var weekDayComparer = function (left, right) {
        return options.weekdays.indexOf(left) > options.weekdays.indexOf(right) ? 1 : -1;
    };
    var timeComparer = function (left, right) {
        return left.Time() > right.Time() ? 1 : -1;
    };

    var save = options.save;
    var maxSteps = options.maxSteps();

    options.save = function () {
        self.Steps.valueHasMutated();
        save();
    };

    self.MaxSteps = maxSteps;
    self.Days = ko.observableArray(spec.Days).extend({ sorted: weekDayComparer });

    var steps = [];
    $.each(spec.Steps, function (_, step) {
        steps.push(new Sensi.EditableSetpoint(step, options));
    });

    self.Steps = ko.observableArray(steps).extend({ sorted: timeComparer });

    self.SetpointTemplate = ko.observable(new Sensi.EditableSetpoint(options.template, options));

    self.createNewSetPoint = function () {
        if (self.Steps().length >= maxSteps) return;
        var template = self.SetpointTemplate();
        
        var existing = $.grep(self.Steps(), function (x) { return x.Time() === template.Time(); });
        if (existing.length > 0) {
            var index = self.Steps().indexOf(existing[0]);
            steps.splice(index, 1);
        }

        template.commit();
        self.Steps.push(template);
        self.SetpointTemplate(new Sensi.EditableSetpoint(options.template, options));
        save();
    };
    self.deleteSetPoint = function (setpoint) {
        var index = self.Steps.indexOf(setpoint);
        if (index === -1) return;
        self.Steps.splice(index, 1);
        save();
    };
};