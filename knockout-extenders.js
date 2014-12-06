var RecomputationTime = 50;

var padTimeComponent = function (i) {
    return (i < 10) ? '0' + i : i;
};

ko.bindingHandlers.checkedChange = {
    init: function (element) {
        var triggerClick = function () {
            $(element).triggerHandler('click');
        };

        ko.utils.registerEventHandler(element, "change", triggerClick);
    }
};

ko.bindingHandlers.clicks = {
    'init': function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var clicks = valueAccessor();

        $.each(clicks, function(_, click) {
            var newValueAccessor = function() {
                var result = {};
                result['click'] = click;
                return result;
            };
            ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindings, viewModel, bindingContext);
        });
    }
};

ko.bindingHandlers.checked = {
    'after': ['value', 'attr'],
    'init': function (element, valueAccessor, allBindings) {
        function checkedValue() {
            return allBindings.has('checkedValue')
                ? ko.utils.unwrapObservable(allBindings.get('checkedValue'))
                : element.value;
        }

        function updateModel() {
            // This updates the model value from the view value.
            // It runs in response to DOM events (click) and changes in checkedValue.
            var isChecked = element.checked,
                elemValue = useCheckedValue ? checkedValue() : isChecked;

            // When we're first setting up this computed, don't change any model state.
            if (!shouldSet) {
                return;
            }

            // We can ignore unchecked radio buttons, because some other radio
            // button will be getting checked, and that one can take care of updating state.
            if (isRadio && !isValueArray && !isChecked) {
                return;
            }

            var modelValue = ko.dependencyDetection.ignore(valueAccessor);
            if (isValueArray) {
                if (oldElemValue !== elemValue) {
                    // When we're responding to the checkedValue changing, and the element is
                    // currently checked, replace the old elem value with the new elem value
                    // in the model array.
                    if (isChecked) {
                        ko.utils.addOrRemoveItem(modelValue, elemValue, true);
                        ko.utils.addOrRemoveItem(modelValue, oldElemValue, false);
                    }

                    oldElemValue = elemValue;
                } else {
                    // When we're responding to the user having checked/unchecked a checkbox,
                    // add/remove the element value to the model array.
                    ko.utils.addOrRemoveItem(modelValue, elemValue, isChecked);
                }
            } else {
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'checked', elemValue, true);
            }
        }

        function updateView() {
            // This updates the view value from the model value.
            // It runs in response to changes in the bound (checked) value.
            var modelValue = ko.utils.unwrapObservable(valueAccessor());

            if (isValueArray) {
                // When a checkbox is bound to an array, being checked represents its value being present in that array
                element.checked = ko.utils.arrayIndexOf(modelValue, checkedValue()) >= 0;
            } else if (isCheckbox) {
                // When a checkbox is bound to any other value (not an array), being checked represents the value being trueish
                element.checked = modelValue;
            } else {
                // For radio buttons, being checked means that the radio button's value corresponds to the model value
                element.checked = (checkedValue() === modelValue);
            }
        }

        var isCheckbox = element.type === "checkbox",
            isRadio = element.type === "radio";

        // Only bind to check boxes and radio buttons
        if (!isCheckbox && !isRadio) {
            return;
        }

        var isValueArray = ko.utils.unwrapObservable(valueAccessor()) instanceof Array,
            oldElemValue = isValueArray ? checkedValue() : undefined,
            useCheckedValue = isRadio || isValueArray,
            shouldSet = false;

        // IE 6 won't allow radio buttons to be selected unless they have a name
        if (isRadio && !element.name)
            ko.bindingHandlers.uniqueName.init(element, function () { return true; });

        // Set up two computeds to update the binding:

        // The first responds to changes in the checkedValue value and to element clicks
        ko.dependentObservable(updateModel, null, { disposeWhenNodeIsRemoved: element });
        ko.utils.registerEventHandler(element, "click", updateModel);

        // The second responds to changes in the model value (the one associated with the checked binding)
        ko.dependentObservable(updateView, null, { disposeWhenNodeIsRemoved: element });

        shouldSet = true;
    }
};

ko.bindingHandlers.fadeOut = {
    update: function(element, valueAccessor) {
        var duration = valueAccessor();
        $(element).fadeOut(duration);
    }
};

ko.bindingHandlers.displayDate = {
    update: function(element, valueAccessor) {
        var value = valueAccessor();
        var today = ko.utils.unwrapObservable(value);

        var formattedDate = today.toDateString().substring(0, 3).toUpperCase()
            + " " + (today.getMonth() + 1)
            + "." + (today.getDate());

        $(element).text(formattedDate);
    }
};

ko.bindingHandlers.displayTime = {
    pad: function (i) {
        return padTimeComponent(i);
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        
        var value = valueAccessor();
        var time = ko.bindingHandlers.displayTime.parse(value);
        var abbreviated = ko.utils.unwrapObservable(allBindingsAccessor().abbreviated || false);
        
        var formattedTime =
            abbreviated ? time.hours12 + (time.mins == 0 ? '' : ':' + padTimeComponent(time.mins)) + time.suffix
                        : time.hours12 + ':' + padTimeComponent(time.mins) + time.suffix;
        

        $(element).text(formattedTime);
    },
    parse: function (value) {
        var time = ko.utils.unwrapObservable(value);
        
        var segments = time.split(":");
        var hours = parseInt(segments[0], 10);
        var min = parseInt(segments[1], 10);

        var result = {
            hours24: hours,
            hours12: ((hours + 11) % 12 + 1),
            mins: min,
            suffix: (hours >= 12) ? 'p' : 'a',
        };
        
        result.value = (result.hours24 + result.mins / 60);

        return result;
    }
};

ko.bindingHandlers.displayTemperature = {
    update: function(element, valueAccessor, allBindingsAccessor) {
        var value = valueAccessor(), allBindings = allBindingsAccessor();

        var temperature = ko.utils.unwrapObservable(value);
        var units = ko.utils.unwrapObservable(allBindings.units || 'F');

        if (temperature) {
            if (units.toUpperCase() === 'F') {
                $(element).text(temperature.F);
            } else {
                $(element).text(temperature.C);
            }
        }
    }
};

ko.bindingHandlers.validate = {
    init: function (element, valueAccessor) {
        var value = valueAccessor();
        
        $(element).validate(value);
    }
};

ko.bindingHandlers['switch'] = {
    getOptions: function (allBindingsAccessor) {
        var allBindings = allBindingsAccessor();
        var options = allBindings.switchOptions || {};       

        return {
            onLabel: options.onLabel,
            offLabel: options.offLabel,
            onValue: options.onLabel || 'On',
            offValue: options.offLabel || 'Off',
            size: options.size
        };
    },
    init: function (element, valueAccessor, allBindingsAccessor) {
        var options = ko.bindingHandlers['switch'].getOptions(allBindingsAccessor);
        var updateHandler = function () {
                var valueToWrite = element.checked ? options.onValue : options.offValue;
                var modelValue = valueAccessor();
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'checked', valueToWrite, true);
            };

        var wrapper = $('<div class="make-switch" />');
        if (options.onLabel)
            wrapper.data('on-label', options.onValue);
        if (options.offLabel)
            wrapper.data('off-label', options.offValue);
        if (options.size)
            wrapper.addClass('switch-' + options.size);

        $(element).wrap(wrapper)
                  .parent()
                  .bootstrapSwitch();

        ko.utils.registerEventHandler($($(element).parents()[1]), 'switch-change', updateHandler);
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var options = ko.bindingHandlers['switch'].getOptions(allBindingsAccessor);

        var value = ko.utils.unwrapObservable(valueAccessor());
        $($(element).parents()[1]).bootstrapSwitch('setState', value === options.onValue);
    }
};

ko.bindingHandlers.popover = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var popoverBindingValues = ko.utils.unwrapObservable(valueAccessor());

        var popoverTitle = popoverBindingValues.title;
        
        var trigger = popoverBindingValues.trigger || 'click';
        
        if (trigger === 'hover') {
            trigger = 'mouseenter mouseleave';
        } else if (trigger === 'focus') {
            trigger = 'focus blur';
        }
        
        var domId = "ko-bs-popover-" + (++ko.bindingHandlers.uniqueName.currentIndex);

        var tmplDom = $('<div/>', {
            "class": "ko-popover",
            "id": domId
        });

        options = {
            content: $(tmplDom[0]).wrap('<p>').parent().html(),
            title: popoverTitle,
            placement: popoverBindingValues.placement,
            container: popoverBindingValues.container
        };
        
        var popoverOptions = $.extend({}, ko.bindingHandlers.popover.options, options);
        $(element).popover(popoverOptions);

        $(element).bind(trigger, function () {
            var popoverAction = (trigger !== 'click') ? 'toggle' : 'show';
            var popoverTriggerEl = $(this);
            
            popoverTriggerEl.popover(popoverAction);

            var popoverInnerEl = $('#' + domId);
            $('.ko-popover').not(popoverInnerEl).parents('.popover').remove();

            var afterRenderAction = function () {
                var triggerElementPosition = $(element).offset().top;
                var triggerElementLeft = $(element).offset().left;
                var triggerElementHeight = $(element).outerHeight();
                var triggerElementWidth = $(element).outerWidth();

                var popover = $(popoverInnerEl).parents('.popover');
                var popoverHeight = popover.outerHeight();
                var popoverWidth = popover.outerWidth();

                switch (popoverOptions.placement) {
                    case 'left':
                    case 'right':
                        popover.offset({ top: triggerElementPosition - popoverHeight / 2 + triggerElementHeight / 2 });
                        break;
                    case 'top':
                        popover.offset({ top: triggerElementPosition - popoverHeight, left: triggerElementLeft - popoverWidth / 2 + triggerElementWidth / 2 });
                        break;
                    case 'bottom':
                        popover.offset({ top: triggerElementPosition + triggerElementHeight, left: triggerElementLeft - popoverWidth / 2 + triggerElementWidth / 2 });
                }
            };

            var templateValueAccessor = function () {
                return {
                    data: popoverBindingValues.data,
                    name: popoverBindingValues.template,
                    templateUrl: popoverBindingValues.templateUrl,
                    afterRender: afterRenderAction
                };
            };

            ko.bindingHandlers.template.init(popoverInnerEl[0], templateValueAccessor);
            ko.bindingHandlers.template.update(popoverInnerEl[0], templateValueAccessor, allBindingsAccessor, viewModel, bindingContext);
        });

        $(document).on('click', '[data-dismiss="popover"]', function (e) { $(element).popover('hide'); });
    },
    options: {
        placement: "right",
        title: "",
        html: true,
        content: "",
        trigger: "manual"
    }
};

ko.bindingHandlers.spinedit = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var value = valueAccessor();
        var allBindings = allBindingsAccessor();
        var options = allBindings.spinOptions || {};
        
        var updateHandler = function () {
            var valueToWrite = element.value === "0" ? element.value : parseInt(element.value, 10);
            var modelValue = valueAccessor();
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'value', valueToWrite);
        };

        var spinOptions = { value: value };
        $.extend(spinOptions, options);
        $.each(spinOptions, function (k, v) {
            spinOptions[k] = ko.utils.unwrapObservable(v);
        });

        $(element).spinedit(spinOptions);
        
        if (ko.isObservable(options.minimum))
            options.minimum.subscribe(function (min) { $(element).spinedit('setMinimum', min); });

        if (ko.isObservable(options.maximum))
            options.maximum.subscribe(function (min) { $(element).spinedit('setMaximum', min); });

        ko.utils.registerEventHandler(element, 'valueChanged', updateHandler);
    },
    update: function(element, valueAccessor) {
        var value = valueAccessor();
        $(element).spinedit('setValue', ko.utils.unwrapObservable(value));
    }
};

ko.bindingHandlers.scroll = {
    init: function (element, valueAccessor) {
        var options = valueAccessor();

        var advanced = {
            advanced: {
                autoExpandHorizontalScroll: true
            }
        };

        $.extend(options, advanced);

        $(element).mCustomScrollbar(options);
    }
};

ko.bindingHandlers.weekDayAbbr = {
    update: function (element, valueAccessor) {
        var weekDays = {
            'Monday': 'M',
            'Tuesday': 'T',
            'Wednesday': 'W',
            'Thursday': 'Th',
            'Friday': 'F',
            'Saturday': 'Sa',
            'Sunday': 'Su'
        };
        var value = valueAccessor();
        var abbr = weekDays[ko.utils.unwrapObservable(value)];

        $(element).text(abbr);
    }
};

ko.extenders.serverMethod = function (target, serverCallback) {
    var result = ko.computed({
        read: target,
        write: function (newValue) {
            var originalValue = target();

            if (originalValue !== newValue) {
                target(newValue);

                serverCallback(newValue)
                    .fail(function() {
                        target(originalValue);
                    });
            }
        }
    });

    result.fromServer = function (newValue) {
        target(newValue);
    };

    return result;
};

ko.extenders.prefix = function(target, prefix) {
    var result = ko.computed({
        read: function() {
            return prefix + target();
        },
        write: function(newValue) {
            target(newValue);
        }
    });

    result(target());

    return result;
};

ko.extenders.temperature = function(target, degrees) {
    var result = ko.computed({
        read: function () {
            if (!target()) return undefined;

            if (degrees().toUpperCase() === 'F') {
                return target().F;
            } else {
                return target().C;
            }
        },
        write: function (newValue) {
            if (typeof newValue === "number") {
                var current = target() || { F: 32, C: 0 };

                if (degrees().toUpperCase() === 'F') {
                    current.F = newValue;
                } else {
                    current.C = newValue;
                }

                target(current);
            } else {
                target(newValue);
            }
        },
        deferEvaluation: true
    });
    
    result(target());
    return result;
};

ko.extenders.counter = function(target, interval) {
    target.interval = undefined;
    target.date = undefined;
    target.pad = function(num) { return num < 10 ? "0" + num : num; };
    target.getDate = function(num) { return new Date(num); };
    target.update = function() {
        var time = target.pad(target.date.getHours()) + ":" + target.pad(target.date.getMinutes()) + ":" + target.pad(target.date.getSeconds());
        target(time);
    };

    var result = ko.computed({
        read: target,
        write: function(newValue) {
            clearInterval(target.interval);

            if (newValue) {
                var args = newValue.split(":");
                target.date = target.getDate(new Date().setHours(args[0], args[1], args[2], 0));

                target.interval = setInterval(function() {
                    target.date = target.getDate(target.date.getTime() + interval);
                    target.update();
                }, interval);

                target.update();
            } else {
                target('N/A');
            }
        }
    });

    result(target());

    return result;
};

var buildStorageExtender = function(storage) {
    return function(target, key) {
        var result = ko.computed({
            read: function() {
                var value = target();
                if (value === undefined) {
                    value = storage.getItem(key);
                    target(value);
                }

                return value;
            },
            write: function(newValue) {
                storage.setItem(key, newValue);
                target(newValue);
            },
            deferEvaluation: true
        });

        if (storage.getItem(key) !== null) {
            result(storage.getItem(key));
        }

        return result;
    };
};
ko.extenders.localStorage = buildStorageExtender(localStorage);
ko.extenders.sessionStorage = buildStorageExtender(sessionStorage);

ko.extenders.time = function(target) {
    target.Hour = ko.computed({
        read: function() {
            var time = ko.bindingHandlers.displayTime.parse(target);

            return time.hours12;
        },
        write: function(newValue) {
            newValue = parseInt(newValue, 10);
            var time = ko.bindingHandlers.displayTime.parse(target);
            var hours = (time.suffix === 'p') ? (newValue === 12) ? 12 : (newValue + 12) : (newValue % 12);

            var formattedTime = padTimeComponent(hours) + ':' + padTimeComponent(time.mins) + ':00';
            target(formattedTime);
        },
        deferEvaluation: true
    });

    target.Min = ko.computed({
        read: function() {
            var time = ko.bindingHandlers.displayTime.parse(target);

            return time.mins;
        },
        write: function(newValue) {
            var mins = parseInt(newValue, 10);
            var time = ko.bindingHandlers.displayTime.parse(target);

            var formattedTime = padTimeComponent(time.hours24) + ':' + padTimeComponent(mins) + ':00';
            target(formattedTime);
        },
        deferEvaluation: true
    });
    
    target.Suffix = ko.computed({
        read: function() {
            var time = ko.bindingHandlers.displayTime.parse(target);
            return time.suffix;
        },
        write: function(newValue) {
            var time = ko.bindingHandlers.displayTime.parse(target);
            var hours = (newValue === 'p' && time.hours12 !== 12) ? (time.hours12 + 12) % 24 : (time.hours24 == 12) ? 0 : time.hours12;
                
            var formattedTime = padTimeComponent(hours) + ':' + padTimeComponent(time.mins) + ':00';
            target(formattedTime);
        },
        deferEvaluation: true
    });

    return target;
};

ko.extenders.sorted = function (target, comparer) {
    var isObserableArray = target() instanceof Array;
    if (!isObserableArray) return target;

    var subscription;
    var sorter = function() {
        subscription.dispose();

        target.sort(comparer);

        subscription = target.subscribe(sorter);
    };

    subscription = target.subscribe(sorter);

    return target;
};

ko.extenders.trackable = function (target) {
    var initValue = target();
    target.committedValue = ko.observable(initValue);
    target.commit = function () {
        target.committedValue(target());
    };
    target.reset = function () {
        target(target.committedValue());
    };
    return target;
};

ko.extenders.trackableTemperature = function (target, degrees) {
    target.extend({ trackable: true });

    degrees.subscribe(function() {
        target.commit();
    });

};

ko.extenders.limited = function(target, bounds) {
    target.Min = bounds.Min;
    target.Max = bounds.Max;

    return target;
};

ko.extenders.deadband = function(target, options) {
    var linked = options.setpoint;
    var writeToLinked = linked.fromServer || linked;
    var deadband = options.deadband;

    var adjustForDeadband = function (newValue) {
        if (!newValue) return;
        var adjusted;

        if (options.type === 'Cool') {
            var heat = linked();
            adjusted = Math.min(newValue - deadband(), heat);
            if (heat != adjusted) {
                writeToLinked(adjusted);
            }
        }

        if (options.type === 'Heat') {
            var cool = linked();
            adjusted = Math.max(newValue + deadband(), cool);
            if (cool != adjusted) {
                writeToLinked(adjusted);
            }
        }
    };
    
    target.subscribe(function(newValue) {
        setTimeout(function() {
            adjustForDeadband(newValue);
        }, RecomputationTime);
    });
    
    return target;
};

ko.observableArray.fn.contains = function(matchValue) {
    return ko.computed(function() {
        var allItems = this();
        return allItems.indexOf(matchValue) !== -1;
    }, this);
};