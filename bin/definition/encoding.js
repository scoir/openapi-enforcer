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
const Parameter     = require('./parameter');

module.exports = {
    allowed: ({ exception, key, parent }) => {
        const schema = parent && parent.parent && parent.parent.value && parent.parent.value.schema;
        return schema && schema.type === 'object' && schema.properties && schema.properties.hasOwnProperty(key)
            ? true
            : 'Encoding property ' + key + ' not found among schema object properties';
    },
    properties: {
        allowReserved: {
            type: 'boolean',
            ignore: ({ parent }) => {
                return parent.parent.key !== 'application/x-www-form-urlencoded';
            },
            default: false
        },
        contentType: {
            type: 'string',
            default: ({ parent }) => {
                const propertyName = parent.parent.parent.key;
                const v = parent.parent.parent.schema[propertyName];
                if (v.type === 'string' && v.format === 'binary') return 'application/octet-stream';
                if (v.type === 'object') return 'application/json';
                if (v.type === 'array') {
                    const i = v.items;
                    if (i.type === 'string' && i.format === 'binary') return 'application/octet-stream';
                    if (i.type === 'object' || i.type === 'array') return 'application/json';
                }
                return 'text/plain';
            }
        },
        explode: {
            type: 'boolean',
            ignore: ({ parent }) => parent.parent.key !== 'application/x-www-form-urlencoded',
            default: ({ parent }) => parent.parent.parent.parent.style === 'form'
        },
        headers: {

        },
        style: Object.assign({}, Parameter.properties.style, {
            ignore: ({ parent }) => parent.parent.key !== 'application/x-www-form-urlencoded',
        })
    }
};