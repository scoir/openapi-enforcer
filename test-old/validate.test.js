/**
 *  @license
 *    Copyright 2018 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict';
const Enforcer      = require('../index');
const expect        = require('chai').expect;

describe('validate', () => {

    const definition = {
        openapi: '3.0.0',
        info: {
            title: 'test',
            version: '1.0.0'
        },
        paths: {},
        components: {
            schemas: createSchemas(3)
        }
    };

    let enforcer;

    before(() => {
        enforcer = new Enforcer(definition);
    });

    describe('array', () => {
        const base = { type: 'array', items: { type: 'number' } };

        it('is array', () => {
            const errors = enforcer.errors(base, 5);
            expect(errors[0]).to.match(/expected an array/i);
        });

        describe('max items 10 no min items', () => {
            const schema = extend(base, { maxItems: 10 });

            it('zero items', () => {
                const errors = enforcer.errors(schema, []);
                expect(errors).to.be.null;
            });

            it('11 items', () => {
                const errors = enforcer.errors(schema, [1,2,3,4,5,6,7,8,9,10,11]);
                expect(errors[0]).to.match(/array length above maximum/i);
            });

        });

        describe('min items 2 no max items', () => {
            const schema = extend(base, { minItems: 2 });

            it('zero items', () => {
                const errors = enforcer.errors(schema, []);
                expect(errors[0]).to.match(/array length below minimum/i);
            });

            it('3 items', () => {
                const errors = enforcer.errors(schema, [1,2,3]);
                expect(errors).to.be.null;
            });

        });

        describe('unique items', () => {
            const schema = extend(base, { uniqueItems: true });

            it('unique', () => {
                const errors = enforcer.errors(schema, [1,2,3]);
                expect(errors).to.be.null;
            });

            it('duplicate', () => {
                const errors = enforcer.errors(schema, [1,2,1]);
                expect(errors[0]).to.match(/array values must be unique/i);
            });

        });

        describe('enum', () => {
            const schema = extend(base, { enum: [[1,2], [3,4]] });

            it('in enum 1', () => {
                const errors = enforcer.errors(schema, [1,2]);
                expect(errors).to.be.null;
            });

            it('in enum 2', () => {
                const errors = enforcer.errors(schema, [3,4]);
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, [1,2,1]);
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('binary', () => {
        const base = { type: 'string', format: 'binary' };

        it('value is a buffer', () => {
            const errors = enforcer.errors(base, Buffer.from(['00110011'], 'binary'));
            expect(errors).to.be.null;
        });

        it('value is not a buffer', () => {
            const errors = enforcer.errors(base, '00110011');
            expect(errors).to.match(/expected value to be a buffer/i);
        });

        describe('min length', () => {
            const schema = extend(base, { minLength: 8 });

            it('below minimum', () => {
                expect(enforcer.errors(schema, Buffer.from([]))).to.match(/expected binary length/i);
            });

            it('at minimum', () => {
                expect(enforcer.errors(schema, Buffer.from(['00110011'], 'binary'))).to.be.null;
            });

        });

        describe('max length', () => {
            const schema = extend(base, { maxLength: 8 });

            it('above max', () => {
                expect(enforcer.errors(schema, Buffer.from([51, 51]))).to.match(/expected binary length/i);
            });

            it('at max', () => {
                expect(enforcer.errors(schema, Buffer.from([51], 'binary'))).to.be.null;
            });

        });

        describe('enum', () => {
            const schema = extend(base, { enum: ['00110011'] }); // 00110011 => 51

            it('in enum', () => {
                const errors = enforcer.errors(schema, Buffer.from([51], 'binary'));
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, Buffer.from([52], 'binary'));
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('boolean', () => {
        const base = { type: 'boolean' };

        it('is true', () => {
            const errors = enforcer.errors(base, true);
            expect(errors).to.be.null;
        });

        it('is false', () => {
            const errors = enforcer.errors(base, false);
            expect(errors).to.be.null;
        });

        it('is zero', () => {
            const errors = enforcer.errors(base, 0);
            expect(errors[0]).to.match(/Expected a boolean/);
        });

        describe('enum', () => {
            const schema = extend(base, { enum: [true] });

            it('in enum', () => {
                const errors = enforcer.errors(schema, true);
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, false);
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('byte', () => {
        const base = { type: 'string', format: 'byte' };

        it('is buffer', () => {
            const errors = enforcer.errors(base, Buffer.from('Aa==', 'base64'));
            expect(errors).to.be.null;
        });

        it('is not buffer', () => {
            const errors = enforcer.errors(base, 'Aa==');
            expect(errors).to.match(/expected value to be a buffer/i);
        });

        describe('enum', () => {
            const schema = extend(base, { enum: ['AQ=='] });

            it('in enum', () => {
                const errors = enforcer.errors(schema, Buffer.from('AQ==', 'base64'));
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, Buffer.from('BQ==', 'base64'));
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('date', () => {
        const base = { type: 'string', format: 'date' };

        it('is date object', () => {
            const errors = enforcer.errors(base, new Date());
            expect(errors).to.be.null;
        });

        it('is not date object', () => {
            const errors = enforcer.errors(base, 'abc');
            expect(errors[0]).to.match(/expected a valid date object/i);
        });

        describe('minimum', () => {
            const schema = extend(base, { minimum: '2000-01-02' });

            it('above minimum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-03'));
                expect(errors).to.be.null;
            });

            it('at minimum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-02'));
                expect(errors).to.be.null;
            });

            it('below minimum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-01'));
                expect(errors[0]).to.match(/greater than or equal/);
            });

        });

        describe('maximum', () => {
            const schema = extend(base, { maximum: '2000-01-02' });

            it('above maximum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-03'));
                expect(errors[0]).to.match(/less than or equal/);
            });

            it('at maximum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-02'));
                expect(errors).to.be.null;
            });

            it('below maximum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-01'));
                expect(errors).to.be.null;
            });

        });

        describe('enum', () => {
            const schema = extend(base, { enum: ['2000-01-01'] });

            it('in enum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-01'));
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, new Date('2001-02-02'));
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('date-time', () => {
        const base = { type: 'string', format: 'date-time' };

        it('is date object', () => {
            const errors = enforcer.errors(base, new Date());
            expect(errors).to.be.null;
        });

        it('is not date object', () => {
            const errors = enforcer.errors(base, 'abc');
            expect(errors[0]).to.match(/expected a valid date object/i);
        });

        describe('enum', () => {
            const schema = extend(base, { enum: ['2000-01-01T01:02:00.000Z'] });

            it('in enum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-01T01:02:00.000Z'));
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, new Date('2000-01-01T00:00:00.000Z'));
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('integer', () => {
        const base = { type: 'integer' };

        it('is an integer', () => {
            const errors = enforcer.errors(base, 5);
            expect(errors).to.be.null;
        });

        it('is a number with decimal', () => {
            const errors = enforcer.errors(base, 1.5);
            expect(errors[0]).to.match(/Expected an integer/);
        });

        describe('multiple of', () => {
            const schema = extend(base, { multipleOf: 2 });

            it('is multiple of 2', () => {
                const errors = enforcer.errors(schema, 4);
                expect(errors).to.be.null;
            });

            it('is not a multiple of 2', () => {
                const errors = enforcer.errors(schema, 5);
                expect(errors[0]).to.match(/Expected a multiple/);
            });

        });

        describe('minimum', () => {
            const schema = extend(base, { minimum: 2 });

            it('above minimum', () => {
                const errors = enforcer.errors(schema, 3);
                expect(errors).to.be.null;
            });

            it('at minimum', () => {
                const errors = enforcer.errors(schema, 2);
                expect(errors).to.be.null;
            });

            it('below minimum', () => {
                const errors = enforcer.errors(schema, 1);
                expect(errors[0]).to.match(/greater than or equal/);
            });

        });

        describe('exclusive minimum', () => {
            const schema = extend(base, { minimum: 2, exclusiveMinimum: true });

            it('above minimum', () => {
                const errors = enforcer.errors(schema, 3);
                expect(errors).to.be.null;
            });

            it('at minimum', () => {
                const errors = enforcer.errors(schema, 2);
                expect(errors[0]).to.match(/greater than 2/);
            });

            it('below minimum', () => {
                const errors = enforcer.errors(schema, 1);
                expect(errors[0]).to.match(/greater than 2/);
            });

        });

        describe('maximum', () => {
            const schema = extend(base, { maximum: 2 });

            it('above maximum', () => {
                const errors = enforcer.errors(schema, 3);
                expect(errors[0]).to.match(/less than or equal/);
            });

            it('at maximum', () => {
                const errors = enforcer.errors(schema, 2);
                expect(errors).to.be.null;
            });

            it('below maximum', () => {
                const errors = enforcer.errors(schema, 1);
                expect(errors).to.be.null;
            });

        });

        describe('exclusive maximum', () => {
            const schema = extend(base, { maximum: 2, exclusiveMaximum: true });

            it('above maximum', () => {
                const errors = enforcer.errors(schema, 3);
                expect(errors[0]).to.match(/less than 2/);
            });

            it('at maximum', () => {
                const errors = enforcer.errors(schema, 2);
                expect(errors[0]).to.match(/less than 2/);
            });

            it('below maximum', () => {
                const errors = enforcer.errors(schema, 1);
                expect(errors).to.be.null;
            });

        });

        describe('enum', () => {
            const schema = extend(base, { enum: [1] });

            it('in enum', () => {
                const errors = enforcer.errors(schema, 1);
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, 2);
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('number', () => {
        const base = { type: 'number' };

        it('is a number', () => {
            const errors = enforcer.errors(base, 1.2);
            expect(errors).to.be.null;
        });

        it('is not a number', () => {
            const errors = enforcer.errors(base, 'a');
            expect(errors[0]).to.match(/Expected a number/);
        });

        describe('enum', () => {
            const schema = extend(base, { enum: [1.2] });

            it('in enum', () => {
                const errors = enforcer.errors(schema, 1.2);
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, 1.3);
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('object', () => {
        const base = { type: 'object' };

        describe('minimum properties', () => {
            const schema = extend(base, { minProperties: 1 });

            it('more than minimum', () => {
                const errors = enforcer.errors(schema, { a: 1, b: 2 });
                expect(errors).to.be.null;
            });

            it('same as minimum', () => {
                const errors = enforcer.errors(schema, { a: 1 });
                expect(errors).to.be.null;
            });

            it('less than minimum', () => {
                const errors = enforcer.errors(schema, {});
                expect(errors[0]).to.match(/greater than or equal/);
            });

        });

        describe('maximum properties', () => {
            const schema = extend(base, { maxProperties: 1 });

            it('more than maximum', () => {
                const errors = enforcer.errors(schema, { a: 1, b: 2 });
                expect(errors[0]).to.match(/less than or equal/);
            });

            it('same as maximum', () => {
                const errors = enforcer.errors(schema, { a: 1 });
                expect(errors).to.be.null;
            });

            it('less than maximum', () => {
                const errors = enforcer.errors(schema, {});
                expect(errors).to.be.null;
            });

        });

        describe('properties', () => {
            const schema = extend(base, {
                properties: {
                    x: { type: 'number' },
                    y: { type: 'boolean' }
                }
            });

            it('valid property values 1', () => {
                const errors = enforcer.errors(schema, { x: 1 });
                expect(errors).to.be.null;
            });

            it('valid property values 2', () => {
                const errors = enforcer.errors(schema, { x: 1, y: true });
                expect(errors).to.be.null;
            });

            it('invalid property value', () => {
                const errors = enforcer.errors(schema, { y: 0 });
                expect(errors[0]).to.match(/Expected a boolean/);
            });

        });

        describe('enum', () => {
            const schema = extend(base, { enum: [{ x: 1 }] });

            it('in enum', () => {
                const errors = enforcer.errors(schema, { x: 1 });
                expect(errors).to.be.null;
            });

            it('not in enum 1', () => {
                const errors = enforcer.errors(schema, { x: 2 });
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

            it('not in enum 2', () => {
                const errors = enforcer.errors(schema, { y: 1 });
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

        describe('required', () => {
            const schema = extend(base, { required: ['name'] });

            it('has required property', () => {
                const errors = enforcer.errors(schema, { name: true });
                expect(errors).to.be.null;
            });

            it('missing required property', () => {
                const errors = enforcer.errors(schema, { age: true });
                expect(errors[0]).to.match(/required properties missing/);
            });

        });

        describe('allOf', () => {
            const schema = {
                allOf: [
                    { properties: { x: { type: 'number' }} },
                    { properties: { y: { type: 'string' }} }
                ]
            };

            it('both valid', () => {
                const errors = enforcer.errors(schema, { x: 2, y: 'hello' });
                expect(errors).to.be.null;
            });

            it('first invalid', () => {
                const errors = enforcer.errors(schema, { x: true, y: 'hello' });
                expect(errors.length).to.equal(1);
                expect(errors[0]).to.match(/x: expected a number/i);
            });

            it('second invalid', () => {
                const errors = enforcer.errors(schema, { x: 2, y: 4 });
                expect(errors.length).to.equal(1);
                expect(errors[0]).to.match(/y: expected a string/i);
            });

            describe('discriminator', () => {
                const schemas = definition.components.schemas;

                it('valid Dog from Pet', () => {
                    const errors = enforcer.errors(schemas.Pet, { animalType: 'Pet', petType: 'Dog', packSize: 2 });
                    expect(errors).to.be.null;
                });

                it('invalid Dog from Pet', () => {
                    const errors = enforcer.errors(schemas.Pet, { animalType: 'Pet', petType: 'Dog', packSize: 'a' });
                    expect(errors[0]).to.match(/expected a number/i);
                });

                it('undefined discriminator', () => {
                    const errors = enforcer.errors(schemas.Pet, { petType: 'Mouse' });
                    expect(errors[0]).to.match(/Undefined discriminator schema/);
                });

                it('valid Cat from Pet', () => {
                    const errors = enforcer.errors(schemas.Pet, { animalType: 'Pet', petType: 'Cat', huntingSkill: 'sneak' });
                    expect(errors).to.be.null;
                });

                it('invalid Cat from Pet', () => {
                    const errors = enforcer.errors(schemas.Pet, { animalType: 'Pet', petType: 'Cat', huntingSkill: 1 });
                    expect(errors[0]).to.match(/expected a string/i);
                });

                it('valid Dog from Animal', () => {
                    const errors = enforcer.errors(schemas.Animal, { animalType: 'Pet', petType: 'Dog', packSize: 2 });
                    expect(errors).to.be.null;
                });

            });

        });

        describe('anyOf', () => {
            const schema = {
                anyOf: [
                    { type: 'number' },
                    { type: 'boolean' },
                ]
            };

            it('valid 1', () => {
                const errors = enforcer.errors(schema, 5);
                expect(errors).to.be.null;
            });

            it('valid 2', () => {
                const errors = enforcer.errors(schema, true);
                expect(errors).to.be.null;
            });

            it('invalid', () => {
                const errors = enforcer.errors(schema, { x: 'abc' });
                expect(errors[0]).to.match(/Did not match any/i);
            });

        });

        describe('oneOf', () => {
            const schema = {
                oneOf: [
                    { type: 'object', properties: { x: { type: 'number', minimum: 2, maximum: 10 } }},
                    { type: 'object', properties: { x: { type: 'number', maximum: 5 } }},
                ]
            };

            it('found 0', () => {
                const errors = enforcer.errors(schema, { x: 11 });
                expect(errors[0]).to.match(/Did not match exactly one/i);
            });

            it('found 1', () => {
                const errors = enforcer.errors(schema, { x: 6 });
                expect(errors).to.be.null;
            });

            it('found 2', () => {
                const errors = enforcer.errors(schema, { x: 3 });
                expect(errors[0]).to.match(/Did not match exactly one/i);
            });

        });

    });

    describe('string', () => {
        const base = { type: 'string' };

        describe('enum', () => {
            const schema = extend(base, { enum: ['abc'] });

            it('in enum', () => {
                const errors = enforcer.errors(schema, 'abc');
                expect(errors).to.be.null;
            });

            it('not in enum', () => {
                const errors = enforcer.errors(schema, 'def');
                expect(errors[0]).to.match(/did not meet enum requirements/i);
            });

        });

    });

    describe('multiple errors', () => {
        const base = { type: 'number', minimum: 10, multipleOf: 5 };

        it('error', () => {
            const errors = enforcer.errors(base, 8);
            expect(errors.length).to.equal(2);
            expect(errors[0]).to.match(/greater than or equal/);
            expect(errors[1]).to.match(/multiple of/);
        });

        it('validate', () => {
            const err = Error('Not this one');
            try {
                enforcer.validate(base, 8);
                throw err;
            } catch (e) {
                expect(e.message).to.match(/one or more errors/i);
            }
        });


    });

    describe('v2', () => {
        let enforcer;

        const definition = {
            swagger: '2.0',
            info: {
                title: 'test',
                version: '1.0.0'
            },
            paths: {},
            definitions: createSchemas(2)
        };

        before(() => {
            enforcer = Enforcer(definition);
        });

        describe('object discriminator', () => {

            it('valid Dog from Pet', () => {
                const errors = enforcer.errors(definition.definitions.Pet, { animalType: 'Pet', petType: 'Dog', packSize: 2 });
                expect(errors).to.be.null;
            });

            it('invalid Dog from Pet', () => {
                const errors = enforcer.errors(definition.definitions.Pet, { animalType: 'Pet', petType: 'Dog', packSize: 'a' });
                expect(errors[0]).to.match(/expected a number/i);
            });

            it('undefined discriminator', () => {
                const errors = enforcer.errors(definition.definitions.Pet, { petType: 'Mouse' });
                expect(errors[0]).to.match(/Undefined discriminator schema/);
            });

            it('valid Cat from Pet', () => {
                const errors = enforcer.errors(definition.definitions.Pet, { animalType: 'Pet', petType: 'Cat', huntingSkill: 'sneak' });
                expect(errors).to.be.null;
            });

            it('invalid Cat from Pet', () => {
                const errors = enforcer.errors(definition.definitions.Pet, { animalType: 'Pet', petType: 'Cat', huntingSkill: 1 });
                expect(errors[0]).to.match(/expected a string/i);
            });

            it('valid Dog from Animal', () => {
                const errors = enforcer.errors(definition.definitions.Animal, { animalType: 'Pet', petType: 'Dog', packSize: 2 });
                expect(errors).to.be.null;
            });

        });
    });

});

function extend(base, extra) {
    return Object.assign({}, base, extra);
}

function createSchemas(version) {
    const Animal = {
        type: 'object',
        discriminator: version === 2
            ? 'animalType'
            : { propertyName: 'animalType' },
        properties: {
            classification: { type: 'string' },
            hasFur: { type: 'boolean' }
        },
        required: ['animalType']
    };

    const Pet = {
        type: 'object',
        allOf: [
            Animal,
            {
                type: 'object',
                discriminator: version === 2
                    ? 'petType'
                    : { propertyName: 'petType' },
                properties: {
                    name: { type: 'string' },
                    petType: { type: 'string' }
                },
                required: ['petType']
            }
        ]
    };

    const Cat = {
        type: 'object',
        allOf: [
            Pet,
            {
                type: 'object',
                properties: {
                    huntingSkill: { type: 'string' }
                },
                required: ['huntingSkill']
            }
        ]
    };

    const Dog = {
        type: 'object',
        allOf: [
            Pet,
            {
                type: 'object',
                properties: {
                    packSize: { type: 'number' }
                },
                required: ['packSize']
            }
        ]
    };

    return {
        Animal: Animal,
        Pet: Pet,
        Cat: Cat,
        Dog: Dog
    };
}