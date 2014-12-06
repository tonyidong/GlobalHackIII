var Sensi = Sensi || {};

Sensi.thermostatSchedules = function (icd, degreeSetting, setpointLimits, systemMode, autoModeDeadband, maxStepsPerDay) {
    var self = this;

    var buildSetpointTemplate = function(type) {
        var setpointTemplate = {
            Time: "07:00:00",
            Heat: type === 'Cool' ? undefined : { F: 65, C: 18 },
            Cool: type === 'Heat' ? undefined : { F: 75, C: 24 }
        };

        return setpointTemplate;
    };

    var buildScheduleFromSpec = function(spec) {
        var options = {
            'save': self.saveSchedule,
            'type': spec.Type,
            'degrees': degreeSetting,
            'limits': setpointLimits,
            'deadband': autoModeDeadband,
            'maxSteps': maxStepsPerDay,
            'template': buildSetpointTemplate(spec.Type),
            'validateName': self.ValidateScheduleName
        };
        return new Sensi.schedule(spec, options);
    };
    
    self.AllSchedules = ko.observableArray();
    self.ScheduleTimeline = ko.observableArray();
    self.CurrentTimelineSetpoint = ko.observable().extend({ sessionStorage: 'currentTimelineSetpoint' });
    
    self.EditScheduleId = ko.observable();
    
    self.buildActiveScheduleObservable = function () {
        var ob = ko.observable()
            .extend({
                serverMethod: function (scheduleId) {
                    return Sensi.Server.setScheduleActive(icd, scheduleId);
                }
            });
        return ob;
    };

    self.buildAvailableSchedulesObservable = function (type) {
        var ob = ko.computed(function () {
            var all = self.AllSchedules();
            var available = [];
            var mode = Sensi.ConvertAux(ko.utils.unwrapObservable(type));

            for (var i = 0; i < all.length; i++)
                if (all[i].Type === mode)
                    available.push(all[i]);
            return available;
        });

        return ob;
    };


    self.UpdateSchedules = function (model) {
        if (!model)
            return;

        if (model.Schedules) {
            self.UpdateModifiedSchedules(model.Schedules);
        }
        
        if (model.Active) {
            var active = { Running: undefined };
            $.extend(active, model.Active);

            $.each(active, function (k, v) {
                if (self.ActiveSchedules[k].fromServer)
                    self.ActiveSchedules[k].fromServer(v);
                else
                    self.ActiveSchedules[k](v);
            });
        }

        if (model.Projection)
            self.BuildTimeline(model.Projection);
    };

    self.saveSchedule = function (schedule) {
        var newSchedule = {
            ObjectId: schedule.ObjectId,
            Name: schedule.Name(),
            Type: schedule.Type,
            Daily: $.map(schedule.Daily(), function (group, _) {
                var daily = {
                    Days: group.Days(),
                    Steps: $.map(group.Steps(), function (step, _) {
                        var heat, cool;
                        if (schedule.Type !== 'Cool') {
                            heat = {};
                            heat[degreeSetting()] = step.Heat();
                        }

                        if (schedule.Type !== 'Heat') {
                            cool = {};
                            cool[degreeSetting()] = step.Cool();
                        }

                        var setpoint = {
                            Time: step.Time(),
                            Heat: heat,
                            Cool: cool
                        };

                        return setpoint;
                    })
                };

                return daily;
            })
        };

        return Sensi.Server.saveSchedule(icd, newSchedule)
            .fail(function(ajax, error, msg) {
                Sensi.Session.Notifications([Error(msg)]);
            });
    };

    self.ActiveSchedules = {
        Heat: self.buildActiveScheduleObservable(),
        Cool: self.buildActiveScheduleObservable(),
        Auto: self.buildActiveScheduleObservable(),
        Running: ko.observable()
    };
    self.AvailableSchedules = {
        Heat: self.buildAvailableSchedulesObservable('Heat'),
        Cool: self.buildAvailableSchedulesObservable('Cool'),
        Auto: self.buildAvailableSchedulesObservable('Auto'),
        Running: self.buildAvailableSchedulesObservable(systemMode),
    };

    self.ActiveSchedule = ko.computed({
        read: function () {
            var mode = Sensi.ConvertAux(systemMode());
            return ko.utils.unwrapObservable(self.ActiveSchedules[mode]);
        },
        write: function (newValue) {
            var mode = Sensi.ConvertAux(systemMode());
            if (mode === 'Off')
                return;

            self.ActiveSchedules[mode](newValue);
        }
    });
    
    self.BuildTimeline = function (model) {

        var timeline = new Array(25);
        var today = model[0].Day;
        var start = model[0].Time.split(":")[0];

        timeline[0] = model[0];
        for (var i = 1; i < model.length; i++) {
            var adjust = model[i].Day === today ? 0 : 24;
            var hour = parseInt(model[i].Time.split(":")[0], 10) + adjust - start + 1;

            var options = { 'degrees': degreeSetting };
            var setpoint = new Sensi.Setpoint(model[i], options);

            if (typeof timeline[hour] === "undefined")
                timeline[hour] = setpoint;
            else if (Array.isArray(timeline[hour]))
                timeline[hour].push(setpoint);
            else
                timeline[hour] = [timeline[hour], setpoint];
        }

        var type = timeline[0].ProjectionType;
        for (var i = 1; i < timeline.length; i++) {
            if (typeof timeline[i] === "undefined") {
                timeline[i] = { ProjectionType: type };
            } else {
                type = 'Schedule';
            }
        }

        self.ScheduleTimeline(timeline);
    };
    
    self.CurrentSchedule = ko.computed(function () {
        var all = self.AllSchedules();
        var id = undefined;

        if (Sensi.Session.AdvancedScheduling() === 'On') {
            id = self.EditScheduleId();
        } else {
            var mode = Sensi.ConvertAux(systemMode());

            if (mode !== 'Off') {
                id = self.ActiveSchedules[mode]();
            }
        }

        var schedule = $.grep(all, function (element, _) { return element.ObjectId === id; });
        return schedule[0];
    });
 
    self.getRunningSchedule = function () {
        var runningId = self.ActiveSchedules.Running();
        var all = self.AllSchedules();
        var schedule = $.grep(all, function (element, _) { return element.ObjectId === runningId; });
        
        return schedule[0];
    };

    self.UpdateModifiedSchedules = function(newSchedules) {
        var schedules = [];
        $.each(newSchedules, function (_, spec) {
            var newSchedule = buildScheduleFromSpec(spec);
            schedules.push(newSchedule);
        });

        self.AllSchedules(schedules);
    };

    self.CreateNewSchedule = function (newScheduleData) {
        var type = $(newScheduleData).find('input[name=scheduleType]').filter(":checked").val();
        var name = $(newScheduleData).find('input[name=schedule-name]').val();
        
        var template = [
            { "Days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "Steps": [buildSetpointTemplate(type)] },
            { "Days": ["Saturday", "Sunday"], "Steps": [buildSetpointTemplate(type)] }
        ];

        var spec = { 'Type': type, 'Name': name, 'Daily': template };
        
        var myNewSchedule = buildScheduleFromSpec(spec);

        
        self.saveSchedule(myNewSchedule)
            .done(function(id) {
                myNewSchedule.ObjectId = id;
                self.AllSchedules.push(myNewSchedule);
                Sensi.Session.Notifications([Message(name + ' has been created')]);
                self.EditSchedule(id);
            }).fail(function (ajax, error, errorMessage) {
                Sensi.Session.Notifications([Error(errorMessage)]);
            });
    };
    
    self.EditBasicSchedule = function () {
        Sensi.Session.SettingsPage('schedules/edit');
    };

    self.EditSchedule = function (id) {
        self.EditScheduleId(ko.utils.unwrapObservable(id));
        self.EditBasicSchedule();
    };
    
    self.EditActiveSchedule = function () {
        var activeSchedule = self.getRunningSchedule();
        
        self.EditSchedule(activeSchedule.ObjectId);
        activeSchedule.SelectCurrentDay();
        return true;
    };

    self.deleteSchedule = function (schedule) {
        var type = schedule.Type;
        
        Sensi.Server.deleteSchedule(icd, schedule.ObjectId)
             .done(function () {
                 var index = self.AllSchedules.indexOf(schedule);
                 self.AllSchedules.splice(index, 1);
                 self.EditScheduleId(self.ActiveSchedules[type]());
                 Sensi.Session.Notifications([Message("Schedule deleted")]);
             })
            .fail(function() {
                Sensi.Session.Notifications([Error("Failed to delete schedule")]);
            });
    };

    self.isActive = function(id) {
        return self.ActiveSchedules.Heat() == id
            || self.ActiveSchedules.Cool() == id
            || self.ActiveSchedules.Auto() == id;
    };

    self.ValidateScheduleName = function (candidateName, id) {
        var nameIsValid = true;

        ko.utils.arrayForEach(self.AllSchedules(), function(item) {
            if (item.Name().toLowerCase() === candidateName.toLowerCase() && item.ObjectId !== id) {
                nameIsValid = false;
            }
        });
        
        return nameIsValid;
    };

    self.ToggleTimelineSetpoint = function (index) {
        var newValue = self.CurrentTimelineSetpoint() == index ? -1 : index;
        self.CurrentTimelineSetpoint(newValue);
    };
};