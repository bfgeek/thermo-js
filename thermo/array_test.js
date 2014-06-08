goog.provide('thermo.array_test');

goog.require('goog.testing.jsunit');
goog.require('thermo.array');

function testSplices_none() {
  var splices = thermo.array.computeSplices(
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5]);
  assertArrayEquals([], splices);
}

function testSplices_noneToSomething() {
  var splices = thermo.array.computeSplices(
      [],
      [1, 2, 3, 4, 5]);
  assertArrayEquals([{removed: [], index: 0, addedCount: 5}], splices);
}

function testSplices_somethingToNone() {
  var splices = thermo.array.computeSplices(
      [1, 2, 3, 4, 5],
      []);
  assertArrayEquals([
    {removed: [1, 2, 3, 4, 5], index: 0, addedCount: 0}
  ], splices);
}

function testSplices_removeInital() {
  var splices = thermo.array.computeSplices(
      [1, 2, 3, 4, 5],
      [3, 4, 5]);
  assertArrayEquals([{removed: [1, 2], index: 0, addedCount: 0}], splices);

  splices = thermo.array.computeSplices(
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5]);
  assertArrayEquals([{removed: [1], index: 0, addedCount: 0}], splices);
}

function testSplices_removeMiddle() {
  var splices = thermo.array.computeSplices(
      [1, 2, 3, 4, 5],
      [1, 2, 5]);
  assertArrayEquals([{removed: [3, 4], index: 2, addedCount: 0}], splices);

  splices = thermo.array.computeSplices(
      [1, 2, 3, 4, 5],
      [1, 2, 4, 5]);
  assertArrayEquals([{removed: [3], index: 2, addedCount: 0}], splices);
}

function testSplices_removeEnd() {
  var splices = thermo.array.computeSplices(
      [1, 2, 3, 4, 5],
      [1, 2, 3]);
  assertArrayEquals([{removed: [4, 5], index: 3, addedCount: 0}], splices);

  splices = thermo.array.computeSplices(
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4]);
  assertArrayEquals([{removed: [5], index: 4, addedCount: 0}], splices);
}

function testSplices_addInitial() {
  var splices = thermo.array.computeSplices(
      [3, 4, 5],
      [1, 2, 3, 4, 5]);
  assertArrayEquals([{removed: [], index: 0, addedCount: 2}], splices);

  splices = thermo.array.computeSplices(
      [2, 3, 4, 5],
      [1, 2, 3, 4, 5]);
  assertArrayEquals([{removed: [], index: 0, addedCount: 1}], splices);
}

function testSplices_addMiddle() {
  var splices = thermo.array.computeSplices(
      [1, 2, 5],
      [1, 2, 3, 4, 5]);
  assertArrayEquals([{removed: [], index: 2, addedCount: 2}], splices);

  splices = thermo.array.computeSplices(
      [1, 2, 3, 5],
      [1, 2, 3, 4, 5]);
  assertArrayEquals([{removed: [], index: 3, addedCount: 1}], splices);
}

function testSplices_addEnd() {
  var splices = thermo.array.computeSplices(
      [1, 2, 3],
      [1, 2, 3, 4, 5]);
  assertArrayEquals([{removed: [], index: 3, addedCount: 2}], splices);

  splices = thermo.array.computeSplices(
      [1, 2, 3, 4],
      [1, 2, 3, 4, 5]);
  assertArrayEquals([{removed: [], index: 4, addedCount: 1}], splices);
}

function testSplices_bothStart() {
  var splices = thermo.array.computeSplices(
      [3, 4, 5, 6],
      [1, 2, 4, 5, 6]);
  assertArrayEquals([{removed: [3], index: 0, addedCount: 2}], splices);
}

function testSplices_bothMiddle() {
  var splices = thermo.array.computeSplices(
      [1, 2, 3, 6],
      [1, 2, 4, 5, 6]);
  assertArrayEquals([{removed: [3], index: 2, addedCount: 2}], splices);
}

function testSplices_bothEnd() {
  var splices = thermo.array.computeSplices(
      [1, 2, 5, 6],
      [1, 2, 3, 4]);
  assertArrayEquals([{removed: [5, 6], index: 2, addedCount: 2}], splices);
}

function testSplices_complex() {
  var splices = thermo.array.computeSplices(
      [1, 2, 4, 5, 8, 9, 9, 0],
      [2, 3, 3, 5, 22, 6, 7, 8, 0, 10]);

  assertArrayEquals([
    {removed: [1], index: 0, addedCount: 0},
    {removed: [4], index: 1, addedCount: 2},
    {removed: [], index: 4, addedCount: 3},
    {removed: [9, 9], index: 8, addedCount: 0},
    {removed: [], index: 9, addedCount: 1}], splices);
}
