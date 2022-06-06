/*
 * Convex hull algorithm - Library (TypeScript)
 *
 * Copyright (c) 2020 Project Nayuki
 * https://www.nayuki.io/page/convex-hull-algorithm
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program (see COPYING.txt and COPYING.LESSER.txt).
 * If not, see <http://www.gnu.org/licenses/>.
 */
export var convexhull;
(function (convexhull) {
    // Returns a new array of points representing the convex hull of
    // the given set of points. The convex hull excludes collinear points.
    // This algorithm runs in O(n log n) time.
    function makeHull(points) {
        let newPoints = points.slice();
        newPoints.sort(convexhull.POINT_COMPARATOR);
        return convexhull.makeHullPresorted(newPoints);
    }
    convexhull.makeHull = makeHull;
    // Returns the convex hull, assuming that each points[i] <= points[i + 1]. Runs in O(n) time.
    function makeHullPresorted(points) {
        if (points.length <= 1)
            return points.slice();
        // Andrew's monotone chain algorithm. Positive y coordinates correspond to "up"
        // as per the mathematical convention, instead of "down" as per the computer
        // graphics convention. This doesn't affect the correctness of the result.
        let upperHull = [];
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            while (upperHull.length >= 2) {
                const q = upperHull[upperHull.length - 1];
                const r = upperHull[upperHull.length - 2];
                if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x))
                    upperHull.pop();
                else
                    break;
            }
            upperHull.push(p);
        }
        upperHull.pop();
        let lowerHull = [];
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            while (lowerHull.length >= 2) {
                const q = lowerHull[lowerHull.length - 1];
                const r = lowerHull[lowerHull.length - 2];
                if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x))
                    lowerHull.pop();
                else
                    break;
            }
            lowerHull.push(p);
        }
        lowerHull.pop();
        if (upperHull.length == 1 && lowerHull.length == 1 && upperHull[0].x == lowerHull[0].x && upperHull[0].y == lowerHull[0].y)
            return upperHull;
        else
            return upperHull.concat(lowerHull);
    }
    convexhull.makeHullPresorted = makeHullPresorted;
    function POINT_COMPARATOR(a, b) {
        if (a.x < b.x)
            return -1;
        else if (a.x > b.x)
            return +1;
        else if (a.y < b.y)
            return -1;
        else if (a.y > b.y)
            return +1;
        else
            return 0;
    }
    convexhull.POINT_COMPARATOR = POINT_COMPARATOR;
})(convexhull || (convexhull = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udmV4SHVsbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGllbnQvdG9vbHMvQ29udmV4SHVsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUtILE1BQU0sS0FBVyxVQUFVLENBMkUxQjtBQTNFRCxXQUFpQixVQUFVO0lBTTFCLGdFQUFnRTtJQUNoRSxzRUFBc0U7SUFDdEUsMENBQTBDO0lBQzFDLFNBQWdCLFFBQVEsQ0FBa0IsTUFBZ0I7UUFDekQsSUFBSSxTQUFTLEdBQWEsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDNUMsT0FBTyxVQUFVLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUplLG1CQUFRLFdBSXZCLENBQUE7SUFHRCw2RkFBNkY7SUFDN0YsU0FBZ0IsaUJBQWlCLENBQWtCLE1BQWdCO1FBQ2xFLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDO1lBQ3JCLE9BQU8sTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXZCLCtFQUErRTtRQUMvRSw0RUFBNEU7UUFDNUUsMEVBQTBFO1FBRTFFLElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQztRQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN2QyxNQUFNLENBQUMsR0FBTSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkIsT0FBTyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtnQkFDN0IsTUFBTSxDQUFDLEdBQU0sU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sQ0FBQyxHQUFNLFNBQVMsQ0FB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ICogQ29udmV4IGh1bGwgYWxnb3JpdGhtIC0gTGlicmFyeSAoVHlwZVNjcmlwdClcclxuICogXHJcbiAqIENvcHlyaWdodCAoYykgMjAyMCBQcm9qZWN0IE5heXVraVxyXG4gKiBodHRwczovL3d3dy5uYXl1a2kuaW8vcGFnZS9jb252ZXgtaHVsbC1hbGdvcml0aG1cclxuICogXHJcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XHJcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxyXG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxyXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxyXG4gKiBcclxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXHJcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXHJcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcclxuICogR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXHJcbiAqIFxyXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcclxuICogYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0gKHNlZSBDT1BZSU5HLnR4dCBhbmQgQ09QWUlORy5MRVNTRVIudHh0KS5cclxuICogSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxyXG4gKi9cclxuXHJcblxyXG5cclxuXHJcbmV4cG9ydCBuYW1lc3BhY2UgY29udmV4aHVsbCB7XHJcbiAgICBcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUG9pbnQge1xyXG4gICAgICAgIHg6IG51bWJlcjtcclxuICAgICAgICB5OiBudW1iZXI7XHJcbiAgICB9XHJcblx0Ly8gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBwb2ludHMgcmVwcmVzZW50aW5nIHRoZSBjb252ZXggaHVsbCBvZlxyXG5cdC8vIHRoZSBnaXZlbiBzZXQgb2YgcG9pbnRzLiBUaGUgY29udmV4IGh1bGwgZXhjbHVkZXMgY29sbGluZWFyIHBvaW50cy5cclxuXHQvLyBUaGlzIGFsZ29yaXRobSBydW5zIGluIE8obiBsb2cgbikgdGltZS5cclxuXHRleHBvcnQgZnVuY3Rpb24gbWFrZUh1bGw8UCBleHRlbmRzIFBvaW50Pihwb2ludHM6IEFycmF5PFA+KTogQXJyYXk8UD4ge1xyXG5cdFx0bGV0IG5ld1BvaW50czogQXJyYXk8UD4gPSBwb2ludHMuc2xpY2UoKTtcclxuXHRcdG5ld1BvaW50cy5zb3J0KGNvbnZleGh1bGwuUE9JTlRfQ09NUEFSQVRPUik7XHJcblx0XHRyZXR1cm4gY29udmV4aHVsbC5tYWtlSHVsbFByZXNvcnRlZChuZXdQb2ludHMpO1xyXG5cdH1cclxuXHRcclxuXHRcclxuXHQvLyBSZXR1cm5zIHRoZSBjb252ZXggaHVsbCwgYXNzdW1pbmcgdGhhdCBlYWNoIHBvaW50c1tpXSA8PSBwb2ludHNbaSArIDFdLiBSdW5zIGluIE8obikgdGltZS5cclxuXHRleHBvcnQgZnVuY3Rpb24gbWFrZUh1bGxQcmVzb3J0ZWQ8UCBleHRlbmRzIFBvaW50Pihwb2ludHM6IEFycmF5PFA+KTogQXJyYXk8UD4ge1xyXG5cdFx0aWYgKHBvaW50cy5sZW5ndGggPD0gMSlcclxuXHRcdFx0cmV0dXJuIHBvaW50cy5zbGljZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBBbmRyZXcncyBtb25vdG9uZSBjaGFpbiBhbGdvcml0aG0uIFBvc2l0aXZlIHkgY29vcmRpbmF0ZXMgY29ycmVzcG9uZCB0byBcInVwXCJcclxuXHRcdC8vIGFzIHBlciB0aGUgbWF0aGVtYXRpY2FsIGNvbnZlbnRpb24sIGluc3RlYWQgb2YgXCJkb3duXCIgYXMgcGVyIHRoZSBjb21wdXRlclxyXG5cdFx0Ly8gZ3JhcGhpY3MgY29udmVudGlvbi4gVGhpcyBkb2Vzbid0IGFmZmVjdCB0aGUgY29ycmVjdG5lc3Mgb2YgdGhlIHJlc3VsdC5cclxuXHRcdFxyXG5cdFx0bGV0IHVwcGVySHVsbDogQXJyYXk8UD4gPSBbXTtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IHA6IFAgPSBwb2ludHNbaV07XHJcblx0XHRcdHdoaWxlICh1cHBlckh1bGwubGVuZ3RoID49IDIpIHtcclxuXHRcdFx0XHRjb25zdCBxOiBQID0gdXBwZXJIdWxsW3VwcGVySHVsbC5sZW5ndGggLSAxXTtcclxuXHRcdFx0XHRjb25zdCByOiBQID0gdXBwZXJIdWxsW3VwcGVySHVsbC5sZW5ndGggLSAyXTtcclxuXHRcdFx0XHRpZiAoKHEueCAtIHIueCkgKiAocC55IC0gci55KSA+PSAocS55IC0gci55KSAqIChwLnggLSByLngpKVxyXG5cdFx0XHRcdFx0dXBwZXJIdWxsLnBvcCgpO1xyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdHVwcGVySHVsbC5wdXNoKHApO1xyXG5cdFx0fVxyXG5cdFx0dXBwZXJIdWxsLnBvcCgpO1xyXG5cdFx0XHJcblx0XHRsZXQgbG93ZXJIdWxsOiBBcnJheTxQPiA9IFtdO1xyXG5cdFx0Zm9yIChsZXQgaSA9IHBvaW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cdFx0XHRjb25zdCBwOiBQID0gcG9pbnRzW2ldO1xyXG5cdFx0XHR3aGlsZSAobG93ZXJIdWxsLmxlbmd0aCA+PSAyKSB7XHJcblx0XHRcdFx0Y29uc3QgcTogUCA9IGxvd2VySHVsbFtsb3dlckh1bGwubGVuZ3RoIC0gMV07XHJcblx0XHRcdFx0Y29uc3QgcjogUCA9IGxvd2VySHVsbFtsb3dlckh1bGwubGVuZ3RoIC0gMl07XHJcblx0XHRcdFx0aWYgKChxLnggLSByLngpICogKHAueSAtIHIueSkgPj0gKHEueSAtIHIueSkgKiAocC54IC0gci54KSlcclxuXHRcdFx0XHRcdGxvd2VySHVsbC5wb3AoKTtcclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRsb3dlckh1bGwucHVzaChwKTtcclxuXHRcdH1cclxuXHRcdGxvd2VySHVsbC5wb3AoKTtcclxuXHRcdFxyXG5cdFx0aWYgKHVwcGVySHVsbC5sZW5ndGggPT0gMSAmJiBsb3dlckh1bGwubGVuZ3RoID09IDEgJiYgdXBwZXJIdWxsWzBdLnggPT0gbG93ZXJIdWxsWzBdLnggJiYgdXBwZXJIdWxsWzBdLnkgPT0gbG93ZXJIdWxsWzBdLnkpXHJcblx0XHRcdHJldHVybiB1cHBlckh1bGw7XHJcblx0XHRlbHNlXHJcblx0XHRcdHJldHVybiB1cHBlckh1bGwuY29uY2F0KGxvd2VySHVsbCk7XHJcblx0fVxyXG5cdFxyXG5cdFxyXG5cdGV4cG9ydCBmdW5jdGlvbiBQT0lOVF9DT01QQVJBVE9SKGE6IFBvaW50LCBiOiBQb2ludCk6IG51bWJlciB7XHJcblx0XHRpZiAoYS54IDwgYi54KVxyXG5cdFx0XHRyZXR1cm4gLTE7XHJcblx0XHRlbHNlIGlmIChhLnggPiBiLngpXHJcblx0XHRcdHJldHVybiArMTtcclxuXHRcdGVsc2UgaWYgKGEueSA8IGIueSlcclxuXHRcdFx0cmV0dXJuIC0xO1xyXG5cdFx0ZWxzZSBpZiAoYS55ID4gYi55KVxyXG5cdFx0XHRyZXR1cm4gKzE7XHJcblx0XHRlbHNlXHJcblx0XHRcdHJldHVybiAwO1xyXG5cdH1cclxuXHRcclxufSJdfQ==