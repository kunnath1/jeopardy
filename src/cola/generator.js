import Canvas, { Image } from 'canvas';
import { join } from 'path';
import { readFileSync } from 'fs';
import winston from 'winston';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 740;

// The y-position of the header row:
const CLUE_OFFSET_Y = 118;
const CLUE_HEIGHT = 124;

// Pre-calcuated positions of columns
const COLUMN_LOCATIONS = [6, 205, 404, 603, 802, 1001];

const ASSETS = join(__dirname, '..', '..', 'assets');

const categoryBackground = new Image();
categoryBackground.src = readFileSync(join(ASSETS, 'blank_category.png'));

const blankValue = new Image();
blankValue.src = readFileSync(join(ASSETS, 'blank_value.png'));

const $values = [200, 400, 600, 800, 1000].reduce((obj, val) => {
  const image = new Image();
  image.src = readFileSync(join(ASSETS, 'values', `${val}.png`));
  obj[val] = image;
  return obj;
}, {});

const dailyDoubleUrl = 'http://i.imgur.com/EqH6Fgw.png';

export async function generateDailydouble() {
  const random = Math.round(Math.random() * 1000000);
  return `${dailyDoubleUrl}?random=${random}`;
}

/**
 * CANVAS GENERATION:
 */


// TODO: Arbitrary split for non-fitting words. Attempt to split on the dash
// (tokenize with dash + custom reducer).
function wrapText(ctx, text, maxWidth) {
  const tokens = text.trim().toUpperCase().split(/(-)|\s/).filter(n => n);
  const lines = [tokens];

  let activeLine = 0;
  let validLayout = false;

  do {
    let fits = false;
    const m = ctx.measureText(lines[activeLine]);
    if (m.width > maxWidth) {
      // Move this word to the beginning of the next line:
      if (!lines[activeLine + 1]) lines.push([]);
      lines[activeLine + 1].unshift(lines[activeLine].pop());
    } else {
      fits = true;
      activeLine++;
    }
    // We're done:
    if (activeLine >= lines.length && fits) {
      validLayout = true;
    }
  } while (!validLayout);

  return lines;
}

function drawLines(ctx, lines, offsetX, lineMidpoint, lineHeight) {
  const midpoint = lineMidpoint - ((lineHeight * lines.length) / 2);
  lines.forEach((lineArray, lineIndex) => {
    const line = lineArray.join(' ');
    ctx.fillText(line, offsetX, midpoint + (lineHeight * lineIndex));
  });
}

export function generateClue(game, clue) {
  winston.profile('render');
  return new Promise((resolve, reject) => {
    const canvas = new Canvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    const MIDPOINT = (CANVAS_HEIGHT / 2) + 37;
    const LINE_HEIGHT = 50;
    const MAX_WIDTH = 650;

    // Blue background:
    ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#26307f';
    ctx.fill();

    // Set up fonts:
    ctx.font = 'bold 40px "Korinna"';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Generate lines:
    const lines = wrapText(ctx, clue.question, MAX_WIDTH);

    // Draw the lines:
    drawLines(ctx, lines, CANVAS_WIDTH / 2, MIDPOINT, LINE_HEIGHT);

    canvas.toBuffer((err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
      winston.profile('render');
    });
  });
}

export function generateBoard(game) {
  winston.profile('render');
  return new Promise((resolve, reject) => {
    const canvas = new Canvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Black background:
    ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'black';
    ctx.fill();

    // Draw values and category backgrounds:
    for (let col = 0; col < COLUMN_LOCATIONS.length; col++) {
      for (let row = 0; row < 6; row++) {
        let offsetHeight = 5;
        let image = categoryBackground;
        // Values:
        if (row !== 0) {
          offsetHeight = (CLUE_HEIGHT * (row - 1)) + CLUE_OFFSET_Y;
          // Draw the dollar values:
          const question = game.questions[((row - 1) * 6) + col];
          image = question.answered ? blankValue : $values[String(question.value)];
        }

        ctx.drawImage(
          image,
          COLUMN_LOCATIONS[col],
          offsetHeight,
          image.width,
          image.height
        );
      }
    }

    // Font for category titles:
    ctx.font = '27px "League Gothic"';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const MAX_WIDTH = 180;
    const LINE_HEIGHT = 27;

    // TODO: Generate the full category row:
    game.categories.forEach((category, i) => {
      const lines = wrapText(ctx, category.title, MAX_WIDTH);

      // Draw the lines:
      const linePos = (194 / 2) + COLUMN_LOCATIONS[i];
      const lineMidpoint = 78;
      drawLines(ctx, lines, linePos, lineMidpoint, LINE_HEIGHT);
    });

    canvas.toBuffer((err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
      winston.profile('render');
    });
  });
}
