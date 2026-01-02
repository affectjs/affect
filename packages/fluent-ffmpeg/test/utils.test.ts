import { vi, describe, it, expect } from "vitest";
import utils from "../src/utils";

describe("Utilities", function () {
  describe("Argument list helper", function () {
    it("Should add arguments to the list", function () {
      const args = utils.args();

      args("-one");
      args("-two", "two-param");
      args("-three", "three-param1", "three-param2");
      args(["-four", "four-param", "-five", "-five-param"]);

      expect(args.get().length).toBe(10);
    });

    it("Should return the argument list", function () {
      const args = utils.args();

      args("-one");
      args("-two", "two-param");
      args("-three", "three-param1", "three-param2");
      args(["-four", "four-param", "-five", "-five-param"]);

      const arr = args.get();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(10);
      expect(arr.indexOf("-three")).toBe(3);
      expect(arr.indexOf("four-param")).toBe(7);
    });

    it("Should clear the argument list", function () {
      const args = utils.args();

      args("-one");
      args("-two", "two-param");
      args("-three", "three-param1", "three-param2");
      args(["-four", "four-param", "-five", "-five-param"]);
      args.clear();

      expect(args.get().length).toBe(0);
    });

    it("Should retrieve arguments from the list", function () {
      const args = utils.args();

      args("-one");
      args("-two", "two-param");
      args("-three", "three-param1", "three-param2");
      args(["-four", "four-param", "-five", "-five-param"]);

      const one = args.find("-one");
      expect(Array.isArray(one)).toBe(true);
      expect(one.length).toBe(0);

      const two = args.find("-two", 1);
      expect(Array.isArray(two)).toBe(true);
      expect(two.length).toBe(1);
      expect(two[0]).toBe("two-param");

      const three = args.find("-three", 2);
      expect(Array.isArray(three)).toBe(true);
      expect(three.length).toBe(2);
      expect(three[0]).toBe("three-param1");
      expect(three[1]).toBe("three-param2");

      const nope = args.find("-nope", 2);
      expect(typeof nope).toBe("undefined");
    });

    it("Should remove arguments from the list", function () {
      const args = utils.args();

      args("-one");
      args("-two", "two-param");
      args("-three", "three-param1", "three-param2");
      args(["-four", "four-param", "-five", "-five-param"]);

      args.remove("-four", 1);
      let arr = args.get();
      expect(arr.length).toBe(8);
      expect(arr[5]).toBe("three-param2");
      expect(arr[6]).toBe("-five");

      args.remove("-one");
      arr = args.get();
      expect(arr.length).toBe(7);
      expect(arr[0]).toBe("-two");

      args.remove("-three", 2);
      arr = args.get();
      expect(arr.length).toBe(4);
      expect(arr[1]).toBe("two-param");
      expect(arr[2]).toBe("-five");
    });
  });

  describe("timemarkToSeconds", function () {
    it("should correctly convert a simple timestamp", function () {
      expect(utils.timemarkToSeconds("00:02:00.00")).toBe(120);
    });
    it("should correctly convert a complex timestamp", function () {
      expect(utils.timemarkToSeconds("00:08:09.10")).toBe(489.1);
    });
    it("should correclty convert a simple float string timestamp", function () {
      expect(utils.timemarkToSeconds("132.44")).toBe(132.44);
    });
    it("should correclty convert a simple float timestamp", function () {
      expect(utils.timemarkToSeconds(132.44)).toBe(132.44);
    });
  });

  describe("Lines ring buffer", function () {
    it("should append lines", function () {
      const ring = utils.linesRing(100);
      ring.append("foo\nbar\nbaz\n");
      ring.append("foo\nbar\nbaz\n");
      expect(ring.get()).toBe("foo\nbar\nbaz\nfoo\nbar\nbaz\n");
    });

    it("should append partial lines", function () {
      const ring = utils.linesRing(100);
      ring.append("foo");
      ring.append("bar\nbaz");
      ring.append("moo");
      expect(ring.get()).toBe("foobar\nbazmoo");
    });

    it("should call line callbacks", function () {
      const lines: unknown[] = [];
      function cb(l: unknown) {
        lines.push(l);
      }

      const lines2: unknown[] = [];
      function cb2(l: unknown) {
        lines2.push(l);
      }

      const ring = utils.linesRing(100);
      ring.callback(cb);
      ring.callback(cb2);

      ring.append("foo\nbar\nbaz");
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe("foo");
      expect(lines[1]).toBe("bar");

      expect(lines2.length).toBe(2);
      expect(lines2[0]).toBe("foo");
      expect(lines2[1]).toBe("bar");

      ring.append("moo\nmeow\n");
      expect(lines.length).toBe(4);
      expect(lines[2]).toBe("bazmoo");
      expect(lines[3]).toBe("meow");

      expect(lines2.length).toBe(4);
      expect(lines2[2]).toBe("bazmoo");
      expect(lines2[3]).toBe("meow");
    });

    it("should close correctly", function () {
      const lines: unknown[] = [];
      function cb(l: unknown) {
        lines.push(l);
      }

      const ring = utils.linesRing(100);
      ring.callback(cb);

      ring.append("foo\nbar\nbaz");
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe("foo");
      expect(lines[1]).toBe("bar");

      ring.close();
      expect(lines.length).toBe(3);
      expect(lines[2]).toBe("baz");

      ring.append("moo\nmeow\n");
      expect(lines.length).toBe(3);
      expect(ring.get()).toBe("foo\nbar\nbaz");
    });

    it("should limit lines", function () {
      const ring = utils.linesRing(2);
      ring.append("foo\nbar\nbaz");
      expect(ring.get()).toBe("bar\nbaz");
      ring.append("foo\nbar");
      expect(ring.get()).toBe("bazfoo\nbar");
    });

    it("should allow unlimited lines", function () {
      const ring = utils.linesRing(0);
      ring.append("foo\nbar\nbaz");
      expect(ring.get()).toBe("foo\nbar\nbaz");
      ring.append("foo\nbar");
      expect(ring.get()).toBe("foo\nbar\nbazfoo\nbar");
    });
  });
});
