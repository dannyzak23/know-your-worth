# Building Know Your Worth

The app people use is `index.html` in the folder above. It is built from the files here. Change these files, not `index.html`.

## The files

- `taxpot.html`: the page and the base code. It also holds jsPDF and JSZip as plain text blocks near the top (they only run when someone makes a tax pack).
- `module_help.js`, `module_pricelist.js`, `module_hours.js`: later code that is placed at the end of the page script. Code further down replaces earlier versions of the same screen, so the last definition of a function is the one in use.
- `rebuild.py`: puts the modules into `taxpot.html` and writes `wrapped.html` (the finished page), `all.js` (the script on its own, for checking) and `test30.js` (the test file).
- `test29.js`: the test harness and the older tests. `extra30.js`: the newer tests.

## Build and test

You need Python 3 and Node.

```
cd src
python rebuild.py test29.js test30.js extra30.js
node --check all.js
node test30.js
```

Every group should end `fails 0 render errs 0`. Then copy the finished page up a level:

```
copy wrapped.html ..\index.html
```

The Claude artifact version is `taxpot.html` on its own.

## Before you push

Pull first. Another session may have changed the live page, and its changes must be folded into these files before you build, or they will be lost.
