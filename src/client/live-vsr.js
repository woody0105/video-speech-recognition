class VideoSpeechRecognition {

  constructor (media, options) {
    let defaults = {
      tracks: {
        metadata: {
          initial: 'hidden'
        },
        subtitles: {
          name: 'English (auto-generated)',
          lang: 'en',
          initial: 'showing'
        }
      }
    }

    this._options    = Object.assign({}, defaults, options)
    this._started    = false
    this._media      = media
    this._textTracks = {}
  }

  start () {
    if (this._started) return

    this._configureTextTracks()
    this._started = true
  }

  stop () {
    if (!this._started) return

    this._cleanTracks()
    this._started = false
  }

  processTranscriptionForRange (transcription, range) {
    this._translateTranscriptToCues(transcription, range)
    console.info(`
      [VSR] processTranscriptionForRange | translated and added cues from transcript for time range
      start: ${range.start} | end: ${range.end}
    `)
  }

  _translateTranscriptToCues (recognitionResponse, range) {
    let { words: transcript, confidence } = recognitionResponse

    const VTTCue = window.VTTCue || window.TextTrackCue

    // TODO: more intelligent grouping, should be done by the
    //       tiny delta between start and end times of nanosecond precision

    let numPerGroup = 10
    let cueGroups = []

    this._processConfidenceScore(confidence, range)

    let cues = transcript
      .map(structuredWord => {
        let start = range.start + this._fromStructuredNanoTime(structuredWord.start)
        let end = range.start + this._fromStructuredNanoTime(structuredWord.end)

        return { start, end, word: structuredWord.word }
      })

    let i = 0
    let cuesCount = cues.length
    // let expectedNumOfGroups = Math.floor( cuesCount / numPerGroup )
    let group = []

    do {
      let cue = cues.shift()
      let next = cues[0]

      if (cue)
        group.push(cue)

      let isLast = ( cue && !next )

      if (!cue || isLast || group.length === numPerGroup) {
        let groupClone = group.slice(0)
        cueGroups.push(groupClone)
        group.length = 0
      }

      if (!cue)
        break

      i++

    } while (i < cuesCount)

    // Averaging out the start/end times to group words together, as nanosecond accuracy causes words to appear 1-by-1 very quickly
    cueGroups.forEach(group => {
      let firstCueStartTime = group[0].start
      let lastCueEndTime = group[ group.length - 1 ].end

      let contents = group
        .map(cue => cue.word)
        .join(' ')

      let combinedCue = new VTTCue(firstCueStartTime, lastCueEndTime, contents)
      this._textTracks.subtitles.addCue(combinedCue)
    })
  }

  _processConfidenceScore (score, range) {
    // Creating a metadata cue for this range
    const VTTCue = window.VTTCue || window.TextTrackCue

    let cue = new VTTCue(range.start, range.end, JSON.stringify({
      confidence: score,
      range
    }))

    this._textTracks.metadata.addCue(cue)
  }

  _fromStructuredNanoTime (struct) {
    let seconds = struct.seconds
    let nanos = struct.nanos

    let result = 0

    if (seconds)
      result = seconds

    if (nanos)
      // e.g. Translating 4000000 nanos -> 0.4 seconds
      result += ( ( nanos / 1000000 ) / 1000 )

    return result
  }

  _configureTextTracks () {
    const trackOptions = this._options.tracks
    const tracks = this._textTracks
    const isPreconfigured = Object.keys(tracks).length > 0

    if (!isPreconfigured) {
      tracks.metadata = videoEl.addTextTrack('metadata')
      tracks.subtitles = videoEl.addTextTrack('subtitles', trackOptions.subtitles.name, trackOptions.subtitles.lang)
    }

    tracks.metadata.mode = trackOptions.metadata.initial
    tracks.subtitles.mode = trackOptions.subtitles.initial
  }

  _cleanTracks () {
    Object
      .values(this._textTracks)
      .forEach(track => {
        do {
          track.removeCue(track.cues[0])
        } while (typeof track.cues[0] !== 'undefined')

        track.mode = 'hidden'
      })
  }

}
