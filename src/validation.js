// Form and data validation utilities
class ValidationManager {
    constructor() {
        this.rules = new Map();
        this.messages = new Map();
        this.customValidators = new Map();
    }

    addRule(name, validator, message) {
        this.rules.set(name, validator);
        if (message) {
            this.messages.set(name, message);
        }
    }

    addCustomValidator(name, validator) {
        this.customValidators.set(name, validator);
    }

    setMessage(rule, message) {
        this.messages.set(rule, message);
    }

    validate(value, rules) {
        const errors = [];
        
        for (const rule of rules) {
            let ruleName, ruleValue;

            if (typeof rule === 'string') {
                ruleName = rule;
                ruleValue = null;
            } else {
                [[ruleName, ruleValue]] = Object.entries(rule);
            }

            const validator = this.rules.get(ruleName) || this.customValidators.get(ruleName);
            
            if (!validator) {
                console.warn(`Validator not found for rule: ${ruleName}`);
                continue;
            }

            const isValid = validator(value, ruleValue);
            
            if (!isValid) {
                const message = this.formatMessage(ruleName, ruleValue, value);
                errors.push(message);
            }
        }

        return errors;
    }

    validateObject(obj, schema) {
        const errors = {};
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = obj[field];
            const fieldErrors = this.validate(value, rules);
            
            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
            }
        }

        return errors;
    }

    formatMessage(rule, ruleValue, value) {
        let message = this.messages.get(rule) || `Invalid value for ${rule}`;
        
        // Replace placeholders in message
        message = message.replace(':value', value);
        message = message.replace(':rule', ruleValue);
        
        return message;
    }

    // Built-in validators
    required(value) {
        return value !== null && value !== undefined && value !== '';
    }

    email(value) {
        if (!value) return true;
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return pattern.test(value);
    }

    minLength(value, min) {
        if (!value) return true;
        return String(value).length >= min;
    }

    maxLength(value, max) {
        if (!value) return true;
        return String(value).length <= max;
    }

    min(value, min) {
        if (!value) return true;
        return Number(value) >= min;
    }

    max(value, max) {
        if (!value) return true;
        return Number(value) <= max;
    }

    pattern(value, pattern) {
        if (!value) return true;
        const regex = new RegExp(pattern);
        return regex.test(value);
    }

    url(value) {
        if (!value) return true;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }

    date(value) {
        if (!value) return true;
        const date = new Date(value);
        return date instanceof Date && !isNaN(date);
    }

    numeric(value) {
        if (!value) return true;
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    integer(value) {
        if (!value) return true;
        return Number.isInteger(Number(value));
    }

    boolean(value) {
        return typeof value === 'boolean';
    }

    inArray(value, array) {
        if (!value) return true;
        return array.includes(value);
    }

    equals(value, other) {
        return value === other;
    }
}

// Create global validation instance
export const validation = new ValidationManager();

// Add built-in validators
validation.addRule('required', validation.required.bind(validation), 'This field is required');
validation.addRule('email', validation.email.bind(validation), 'Invalid email address');
validation.addRule('minLength', validation.minLength.bind(validation), 'Minimum length is :rule characters');
validation.addRule('maxLength', validation.maxLength.bind(validation), 'Maximum length is :rule characters');
validation.addRule('min', validation.min.bind(validation), 'Minimum value is :rule');
validation.addRule('max', validation.max.bind(validation), 'Maximum value is :rule');
validation.addRule('pattern', validation.pattern.bind(validation), 'Invalid format');
validation.addRule('url', validation.url.bind(validation), 'Invalid URL');
validation.addRule('date', validation.date.bind(validation), 'Invalid date');
validation.addRule('numeric', validation.numeric.bind(validation), 'Must be a number');
validation.addRule('integer', validation.integer.bind(validation), 'Must be an integer');
validation.addRule('boolean', validation.boolean.bind(validation), 'Must be a boolean');
validation.addRule('inArray', validation.inArray.bind(validation), 'Invalid option selected');
validation.addRule('equals', validation.equals.bind(validation), 'Values must match');