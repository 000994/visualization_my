/* 轻量级词云实现 - 基于 Canvas */
(function(window) {
  function WordCloud(container, options) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = container.clientWidth || 400;
    this.height = container.clientHeight || 300;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    container.innerHTML = '';
    container.appendChild(this.canvas);

    this.words = options.words || [];
    this.colors = options.colors || ['#C85D4D', '#F0B79A', '#FAE7D9', '#E3EEEF', '#AECDD7', '#619DB8'];
    this.maxFontSize = options.maxFontSize || 40;
    this.minFontSize = options.minFontSize || 14;
    this.padding = options.padding || 10;
    this.rotations = options.rotations || [0, 45, -45];
  }

  WordCloud.prototype.draw = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.words.length === 0) return;

    var self = this;
    var maxValue = Math.max.apply(null, this.words.map(function(w) { return w.value; }));
    var minValue = Math.min.apply(null, this.words.map(function(w) { return w.value; }));

    var placed = [];
    var words = this.words.slice().sort(function(a, b) { return b.value - a.value; });

    words.forEach(function(word, idx) {
      var size = self.minFontSize + (word.value - minValue) / (maxValue - minValue) * (self.maxFontSize - self.minFontSize);
      var color = self.colors[idx % self.colors.length];
      var rotation = self.rotations[Math.floor(Math.random() * self.rotations.length)] * Math.PI / 180;

      self.placeWord(word.name, size, color, rotation, placed);
    });
  };

  WordCloud.prototype.placeWord = function(text, size, color, rotation, placed) {
    var self = this;
    this.ctx.font = Math.floor(size) + 'px Arial, sans-serif';
    var metrics = this.ctx.measureText(text);
    var w = metrics.width + this.padding * 2;
    var h = size + this.padding * 2;

    var x, y, attempts = 0;
    var maxAttempts = 100;

    do {
      x = Math.random() * (this.width - w);
      y = Math.random() * (this.height - h);
      attempts++;
    } while (this.isColliding({x: x, y: y, w: w, h: h}, placed) && attempts < maxAttempts);

    if (attempts < maxAttempts) {
      placed.push({x: x, y: y, w: w, h: h});

      this.ctx.save();
      this.ctx.translate(x + w / 2, y + h / 2);
      this.ctx.rotate(rotation);
      this.ctx.fillStyle = color;
      this.ctx.font = Math.floor(size) + 'px Arial, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, 0, 0);
      this.ctx.restore();
    }
  };

  WordCloud.prototype.isColliding = function(box, placed) {
    for (var i = 0; i < placed.length; i++) {
      var p = placed[i];
      if (box.x < p.x + p.w + 5 && box.x + box.w + 5 > p.x &&
          box.y < p.y + p.h + 5 && box.y + box.h + 5 > p.y) {
        return true;
      }
    }
    return false;
  };

  window.WordCloud = WordCloud;
})(window);
