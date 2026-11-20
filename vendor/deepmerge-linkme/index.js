var defaultIsMergeableObject = require('is-mergeable-object')

function emptyTarget(val) {
	return Array.isArray(val) ? [] : {}
}

function cloneUnlessOtherwiseSpecified(value, options) {
	return (options.clone !== false && options.isMergeableObject(value))
		? deepmerge(emptyTarget(value), value, options)
		: value
}

function defaultArrayMerge(target, source, options) {
	return target.concat(source).map(function(element) {
		return cloneUnlessOtherwiseSpecified(element, options)
	})
}

function getMergeFunction(key, options) {
	if (!options.customMerge) {
		return deepmerge
	}
	var customMerge = options.customMerge(key)
	return typeof customMerge === 'function' ? customMerge : deepmerge
}

function getEnumerableOwnPropertySymbols(target) {
	return Object.getOwnPropertySymbols
		? Object.getOwnPropertySymbols(target).filter(function(symbol) {
			return Object.propertyIsEnumerable.call(target, symbol)
		})
		: []
}

function getKeys(target) {
	return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target))
}

function isForbiddenKey(key) {
	return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

function defineOwnDataProperty(target, key, value) {
	Object.defineProperty(target, key, {
		value: value,
		writable: true,
		enumerable: true,
		configurable: true
	})
}

function propertyIsOnObject(object, property) {
	if ((typeof object !== 'object' || object === null) && typeof object !== 'function') {
		return false
	}
	try {
		return property in object
	} catch(_) {
		// A proxy that prevents inspection must not make the property appear safe.
		return true
	}
}

// Protects from prototype poisoning and unexpected merging up the prototype chain.
function propertyIsUnsafe(target, key) {
	if (isForbiddenKey(key)) {
		return true
	}
	try {
		return propertyIsOnObject(target, key)
			&& !(Object.hasOwnProperty.call(target, key)
				&& Object.propertyIsEnumerable.call(target, key))
	} catch(_) {
		return true
	}
}

function mergeObject(target, source, options) {
	var destination = {}
	if (options.isMergeableObject(target)) {
		getKeys(target).forEach(function(key) {
			if (!isForbiddenKey(key)) {
				defineOwnDataProperty(destination, key, cloneUnlessOtherwiseSpecified(target[key], options))
			}
		})
	}
	getKeys(source).forEach(function(key) {
		if (isForbiddenKey(key) || propertyIsUnsafe(target, key)) {
			return
		}

		if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
			defineOwnDataProperty(destination, key, getMergeFunction(key, options)(target[key], source[key], options))
		} else {
			defineOwnDataProperty(destination, key, cloneUnlessOtherwiseSpecified(source[key], options))
		}
	})
	return destination
}

function deepmerge(target, source, options) {
	options = options || {}
	options.arrayMerge = options.arrayMerge || defaultArrayMerge
	options.isMergeableObject = options.isMergeableObject || defaultIsMergeableObject
	// cloneUnlessOtherwiseSpecified is added to `options` so that custom arrayMerge()
	// implementations can use it. The caller may not replace it.
	options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified

	var sourceIsArray = Array.isArray(source)
	var targetIsArray = Array.isArray(target)
	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray

	if (!sourceAndTargetTypesMatch) {
		return cloneUnlessOtherwiseSpecified(source, options)
	} else if (sourceIsArray) {
		return options.arrayMerge(target, source, options)
	} else {
		return mergeObject(target, source, options)
	}
}

deepmerge.all = function deepmergeAll(array, options) {
	if (!Array.isArray(array)) {
		throw new Error('first argument should be an array')
	}

	return array.reduce(function(prev, next) {
		return deepmerge(prev, next, options)
	}, {})
}

module.exports = deepmerge
