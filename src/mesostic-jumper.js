///////////////////// MesosticJumper /////////////////////

subclass(MesosticJumper, MesosticReader);

function MesosticJumper(g, rx, ry, speed) {

  MesosticReader.call(this, g, rx, ry, speed); // superclass constructor
  this.type = 'MesosticJumper'; //  superclass variable(s)
  this.activeFill = colorToObject(0, 149, 255, 255); // #0095FF
}

var M = MesosticJumper.prototype, DBUG = true;

M.selectNext = function () {

  //if (this.current !== this.lastRead()) // TODO: quick fix for page-turning
    //letter = this.advanceLetter();

  //var lastLetter = letter;
  var letter = this.advanceLetter();

  if (!letter)
    throw Error('No letter in MesosticJumper.selectNext');

  var next, ngramLineIdxs = [ 1, 2, 3, 4, 5, 6 ], last = this.lastRead(2);

  if (last) { // ignore n-grams if no last

    next = this.checkLines(letter, ngramLineIdxs, 3, last);

    // got nothing, now retry, with bigrams
    if (!next) {
      console.log("MesoJumper: no trigrams for '" + letter + "',  trying bigrams..."+(last?'':' no last!'));
      next = this.checkLines(letter, ngramLineIdxs, 2, last);
    }
  }

  // got nothing, now retry, ignoring ngrams
  if (!next) {
    console.log("MesoJumper: no bigrams for '" + letter + "',  trying w'out n-grams...");
    next = this.checkLines(letter, [1, 2, 3, 4 ], 0);
  }

  if (next) {

    this.letter = letter;
    return this.adjustSelected(next);
  }

  this.revertLetter(); // hack
  console.log("MesoJumper: nothing found for '" + letter + "',  trying superSelectNext ***");
  return Object.getPrototypeOf(MesosticJumper.prototype).selectNext.call(this);
}

M.checkLines = function (letter, targetLines, mode, last) {

  var result, p = Grid.coordsFor(this.current), grid = p.grid;

  OUTER: for (var j = 0; j < targetLines.length; j++)
  {
    var rtg = grid;

    // use targets above
    var lineIdx = p.y + targetLines[j];

    // but last line wraps
    if (p.y == rtg.numLines() - 1) {
      lineIdx = j;
      rtg = rtg.getNext();
    }

    // don't go off the grid
    if (lineIdx > rtg.numLines() - 1)
      continue;

    // get matching words, ordered by x-distance
    var matches = this.searchLineForLetter(letter, last, rtg, lineIdx, mode);

    if (matches.length)
    {
      result = matches[0];

      if (result && mode != 0 && result.distanceTo(this.current) > 500)
      {
        console.log("skipping big dist");
        result = null;
      }
      else
        break OUTER;
    }
  }

  return result;
}

M.searchLineForLetter = function(letter, last, rtg, lineIdx, mode) {

  if (!letter)
    throw Error("Bad letter: " + letter);

  if (lineIdx > rtg.numLines() - 1)
    throw Error("Bad line index: " + lineIdx);

  var rts, result = [], words = rtg.lineAt(lineIdx);

  console.log('Search: line='+lineIdx+' mode='+mode+ ' curr='+this.current.text()+' last='+(last?last.text():'NULL'));

  try {

    // try each word in the line
    for (var i = 0; i < words.length; i++) {

      if (words[i] && words[i].includes(letter)) {

        if (mode === 3) {
          rts = [ last, this.current, words[i] ];
          if (!this.pman.isTrigram(rts))
            continue;
        }
        else if (mode === 2) {
          rts = [ this.current, words[i] ];
          //console.log('key', key);
          if (!this.pman.isBigram(rts))
            continue;
        }

        result.push(words[i]);
      }
    }
  }
  catch (e) {
    console.warn("searchLineForLetter() error...");
    throw e;
  }

  var currentCell = this.current;
  result.sort(function(x, y) {          // TODO: verify this sort is working correctly
    var d1 = currentCell.distanceTo(x);
    var d2 = currentCell.distanceTo(y);
    return y > x ? -1 : 1;
  });

  function str(r) {
    var s = '[';
    for (var i = 0; r && i < r.length; i++) {
      s += r[i].text() +' ';
    }
    return s.trim() + ']';
  }
  console.log("Result="+str(result));

  return result;
}

M.onEnterCell = function (curr) {
  if (this.lastRead())
  // this.pman.defaultFill = curr.fill();
  curr.fill(this.activeFill);
}

M.onExitCell = function (curr) {

  curr.colorTo(this.pman.defaultFill, 1);
  Grid.resetCell(curr, true);
}

M.textForServer = function () {

    var lett, tfs, txt = this.current.text();

    if (!this.letter) return '';

    lett = this.letter.toUpperCase();

    tfs = this._pad(txt, lett, txt.indexOf(lett));

    if (this.sendLinebreak) {

      this.sendLinebreak = false;
      tfs = "\n" + tfs;
    }

    return tfs;
  },

  M._pad = function (raw, c, idx) {

    var pre = raw.substring(0, idx),
      padStr = '';
    for (var i = 0; i < this.maxWordLen - pre.length - 1; i++)
      padStr += ' ';

    return padStr + raw;
  }

/* M._resetLine = function(rt) {
		var cf = Grid.coordsFor(rt);
		var line = cf.grid.lineAt(cf.y), s='';
		for(var i=0,j=line.length; i<j; i++)
		s += line[i].text() + " ";
		console.log(s);
}*/

if (typeof module != 'undefined' && module.exports) { // for node

  module.exports = MesosticReader;
}
