thermo-js
=========

Outline
 - web is broken
 - recent work
 - how thermo approaches this problem
 - individual features (templates!)
 - work to be done

The web is broken. Developers working with the web have so many ways that they
can shoot themselves in the foot, I've personally lost count.

For example layout thrashing:

```javascript
var height = el.offsetHeight;
el.classList.add('foo');
// Sometime later in code.
var height = el.offsetHeight; // Suprise! Forced layout of the DOM.
```

Tooling for these problems have improved significantly (Chrome timeline)
however the majority of us still go through a "Find all the performance bugs
stage" which is tedious and sometimes involves rewrites of large amounts of
code.

A lot of recent work in frameworks has slowly been improving this.
(mention other frameworks).

Thermo is a mobile focused web framework.

Within thermo everything runs within the scheduler. Think of this as a
mini-game engine that the web...
