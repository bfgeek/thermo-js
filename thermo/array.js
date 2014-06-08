goog.provide('thermo.array');


/**
 * Computes the splices need to bring the old array up to the new array. By no
 * means optimal, written to expect single chunks to be added/removed at a time.
 * Does not compute the optimal splices.
 * If arrays are the same complexity is O(n).
 *
 * @param {!Array.<T>} oldArray
 * @param {!Array.<T>} newArray
 * @return {!Array.<{removed: !Array.<T>, addedCount: number, index: number}>}
 * @template T
 */
thermo.array.computeSplices = function(oldArray, newArray) {
  var splices = [];
  var oldIndex = 0;
  var newIndex = 0;

  while (oldIndex < oldArray.length && newIndex < newArray.length) {
    // Same element, continue to next.
    if (oldArray[oldIndex] == newArray[newIndex]) {
      oldIndex++;
      newIndex++;
      continue;
    }

    // To be added to list of splices.
    var removed = [];
    var index = newIndex;
    var addedCount = 0;

    // Determine items which have been removed.
    var finished = false;
    var idx;
    while (oldIndex < oldArray.length && !finished) {
      // See if the currend old element is in the new array.
      var element = oldArray[oldIndex];
      var idx = newArray.indexOf(element, newIndex);
      if (idx < 0) {
        removed.push(element);
        oldIndex++;
      } else {
        // Found an element which we know about.
        finished = true;
      }
    }

    if (finished) {
      // Didn't exhaust the old array, determine the number of items added.
      addedCount = idx - newIndex;
      newIndex = idx;
    } else {
      // Exhausted old array without finding anything.
      addedCount = newArray.length - newIndex;
      newIndex = newArray.length;
    }

    splices.push({removed: removed, index: index, addedCount: addedCount});
  }

  if (oldIndex == oldArray.length && newIndex == newArray.length) {
    // Nothing to do, exhausted both arrays.
  } else if (newIndex == newArray.length) {
    // Exhausted new array, old array has items which need to be deleted.
    splices.push({
      removed: oldArray.slice(oldIndex),
      index: newIndex,
      addedCount: 0
    });
  } else if (oldIndex == oldArray.length) {
    // Exhausted old array, new array has items which have been added.
    splices.push({
      removed: [],
      index: newIndex,
      addedCount: newArray.length - newIndex
    });
  } else {
    // Should never occur.
    goog.asserts.fail();
  }

  return splices;
};
