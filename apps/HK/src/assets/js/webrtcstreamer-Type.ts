class WebrtcstreamerType {
  videoElement: HTMLMediaElement | HTMLVideoElement;
  streamServerUrl: string;
  streamServerUrlBase: string = '/api';
  pc?: RTCPeerConnection;
  pcConfig?: RTCConfiguration;
  mediaConstraints;
  earlyCandidates: any[];
  iceServers?: RTCConfiguration;
  remoteMediaStream?: MediaStream = new MediaStream();
  peerid?: string;
  constructor(videoElement: HTMLVideoElement | string, streamServerUrl: string) {
    if (typeof videoElement === 'string') {
      this.videoElement = document.getElementById(videoElement) as HTMLVideoElement;
    } else {
      this.videoElement = videoElement;
    }
    this.streamServerUrl =
      streamServerUrl || location.protocol + '//' + window.location.hostname + ':' + window.location.port;
    this.pc = undefined;

    this.mediaConstraints = { offerToReceiveAudio: true, offerToReceiveVideo: true };
    /*this.iceServers = {
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302'],
        },
        {
          credential: '123',
          urls: ['turn:10.11.3.123:3478?transport=udp', 'turn:10.11.3.123:3478?transport=tcp'],
          username: 'root',
        },
      ],
      iceTransportPolicy: 'all',
    };*/
    this.earlyCandidates = [];
  }

  connect(videoUrl: string, audioUrl: string, options: string, localstream: MediaStream, prefmime: string) {
    this.disconnect();
    if (!this.iceServers) {
      //从媒体服务器获取ice
      fetch(`${this.streamServerUrl}${this.streamServerUrlBase}/getIceServers`)
        .then(this._handleHttpErrors)
        .then((response) => response.json())
        .then((response) => this.onReceiveGetIceServers(response, videoUrl, audioUrl, options, localstream, prefmime))
        .catch((error) => this.onError('getIceServers ' + error));
    } else {
      this.onReceiveGetIceServers(this.iceServers, videoUrl, audioUrl, options, localstream, prefmime);
    }
  }

  createPeerConnection() {
    let pc = (this.pc = new RTCPeerConnection(this.pcConfig));

    this.peerid = parseInt(`${Math.random() * 999999999999999}`).toString();

    pc.onicecandidate = (evt) => this.onIceCandidate(evt);
    pc.ontrack = (evt) => this.onAddtrack(evt);
    pc.oniceconnectionstatechange = () => {
      console.log('oniceconnectionstatechange  state: ' + pc.iceConnectionState);
      if (this.videoElement) {
        if (pc.iceConnectionState === 'connected') {
          this.videoElement.style.opacity = '1.0';
        } else if (pc.iceConnectionState === 'disconnected') {
          this.videoElement.style.opacity = '0.25';
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          this.videoElement.style.opacity = '0.5';
        } else if (pc.iceConnectionState === 'new') {
          this.getIceCandidate();
        }
      }
    };
    pc.ondatachannel = function (evt) {
      evt.channel.onopen = function () {
        this.send('remote channel openned');
      };
      evt.channel.onmessage = function (event) {
        console.log('远端 datachannel:' + JSON.stringify(event.data));
      };
    };

    try {
      let dataChannel = pc.createDataChannel('ClientDataChannel');
      dataChannel.addEventListener('open', function () {
        this.send('local channel openned');
      });
      dataChannel.addEventListener('message', function (evt) {
        console.log('本地 datachannel:' + JSON.stringify(evt.data));
      });
    } catch (e) {
      console.log('Cannor create datachannel error: ' + e);
    }
    return pc;
  }

  onAddtrack(evt: RTCTrackEvent) {
    this.remoteMediaStream?.addTrack(evt.track);
    this.videoElement.srcObject = this.remoteMediaStream!;
    let promise = this.videoElement.play();
    if (promise !== undefined) {
      promise.catch((error) => {
        console.warn('error:' + error);
      });
    }
  }

  onIceCandidate(event: any) {
    if (event.candidate) {
      if (this.pc?.currentRemoteDescription) {
        this.addIceCandidate(this?.peerid!, event.candidate);
      } else {
        this.earlyCandidates.push(event.candidate);
      }
    } else {
      // console.log('End of candidates.');
    }
  }

  addIceCandidate(peerid: string, candidate: any) {
    fetch(`${this.streamServerUrl}${this.streamServerUrlBase}/addIceCandidate?peerid=${peerid}`, {
      method: 'POST',
      body: JSON.stringify(candidate),
    })
      .then(this._handleHttpErrors)
      .then((response) => response.json())
      .then(() => {
        // console.log('addIceCandidate ok:' + response);
      })
      .catch((error) => this.onError('addIceCandidate ' + error));
  }

  onReceiveGetIceServers(
    iceServers: RTCConfiguration,
    videoUrl: string,
    audioUrl: string,
    options: string,
    stream: MediaStream,
    prefmime: string
  ) {
    this.iceServers = iceServers;
    this.pcConfig = iceServers || { iceServers: [] };
    try {
      this.createPeerConnection();

      let callurl = `${this.streamServerUrl}/api/call?peerid=${this?.peerid}&url=${encodeURIComponent(videoUrl)}`;
      if (audioUrl) {
        callurl += '&audiourl=' + encodeURIComponent(audioUrl);
      }
      if (options) {
        callurl += '&options=' + encodeURIComponent(options);
      }

      if (stream) {
        for (const track of stream.getTracks()) {
          this.pc?.addTrack(track);
        }
      }

      this.earlyCandidates.length = 0;

      this.pc?.createOffer(this.mediaConstraints).then(
        (sessionDescription) => {
          if (prefmime != undefined) {
            //set prefered codec
            const [prefkind] = prefmime.split('/');
            const codecs = RTCRtpReceiver.getCapabilities(prefkind)?.codecs;
            const preferedCodecs = codecs?.filter((codec) => codec.mimeType === prefmime);

            // console.log(`preferedCodecs:${JSON.stringify(preferedCodecs)}`);
            this.pc
              ?.getTransceivers()
              .filter((transceiver) => transceiver.receiver.track.kind === prefkind)
              .forEach((tcvr) => {
                if (tcvr.setCodecPreferences != undefined) {
                  tcvr.setCodecPreferences(preferedCodecs!);
                }
              });
          }

          this.pc?.setLocalDescription(sessionDescription).then(
            () => {
              fetch(callurl, { method: 'POST', body: JSON.stringify(sessionDescription) })
                .then(this._handleHttpErrors)
                .then((response) => response.json())
                .catch((error) => this.onError('call ' + error))
                .then((response) => this.onReceiveCall(response))
                .catch((error) => this.onError('call ' + error));
            },
            (error) => {
              console.log('setLocalDescription error:' + JSON.stringify(error));
            }
          );
        },
        (error) => {
          alert('Create offer error:' + JSON.stringify(error));
        }
      );
    } catch (e) {
      this.disconnect();
      console.log('connect error: ' + e);
    }
  }

  onReceiveCall(dataJson: any) {
    this.pc?.setRemoteDescription(new RTCSessionDescription(dataJson)).then(
      () => {
        while (this.earlyCandidates.length) {
          let candidate = this.earlyCandidates.shift();
          this.addIceCandidate(this?.peerid!, candidate);
        }
        this.getIceCandidate();
      },
      (error) => {
        console.log('setRemoteDescription error:' + JSON.stringify(error));
      }
    );
  }
  getIceCandidate() {
    fetch(`${this.streamServerUrl}${this.streamServerUrlBase}/getIceCandidate?peerid=${this?.peerid}`)
      .then(this._handleHttpErrors)
      .then((response) => response.json())
      .then((response) => this.onReceiveCandidate(response))
      .catch((error) => this.onError('getIceCandidate ' + error));
  }
  onReceiveCandidate(dataJson: any) {
    if (dataJson) {
      for (let i = 0; i < dataJson.length; i++) {
        let candidate = new RTCIceCandidate(dataJson[i]);
        this.pc
          ?.addIceCandidate(candidate)
          .catch((error) => console.log('addIceCandidate error:' + JSON.stringify(error)));
      }
      this.pc?.addIceCandidate();
    }
  }

  _handleHttpErrors(response: Response) {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    return response;
  }

  disconnect() {
    if (this.videoElement?.srcObject) {
      for (const track of (this.videoElement.srcObject as MediaStream).getTracks()) {
        track.stop();
        (this.videoElement.srcObject as MediaStream).removeTrack(track);
      }
    }
    if (this.pc) {
      fetch(`${this.streamServerUrl}${this.streamServerUrlBase}/hangup?peerid=${this?.peerid}`)
        .then(this._handleHttpErrors)
        .catch((error) => this.onError('hangup ' + error));
      try {
        this.pc.close();
        console.log('webRTC-stream销毁');
      } catch (e) {
        console.log('Failure close peer connection:' + e);
      }
      this.pc = undefined;
    }
  }

  onError(status: string) {
    console.log('onError:' + status);
  }
}
export default WebrtcstreamerType;
