﻿using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class SoundReactive : MonoBehaviour {

	public static bool DRAW_SPECTRUM = false;

	public float sensitivity = 100.0f;
	public float loudness = 0.0f;
	public float frequency = 0.0f;
	public int samplerate = 11024;

	private static List<ISoundReact>  m_listeners;
	private static SoundReactive m_instance;
	public static SoundReactive Instance
	{
		get{

			if(m_instance == null)
			{
				GameObject go = new GameObject();
				go.name = "SoundReactive";
				m_instance = go.AddComponent<SoundReactive>();
				m_listeners = new List<ISoundReact>();
			}

			return m_instance;
		}
	}


	private AudioSource m_source;
	private float m_maxNormalSpectrum;
	private float m_averageSpectrum
	{
		get
		{
			float val = 0;

			foreach(float v in m_averageValues)
				val += v;


			return val / m_averageValues.Count;

		}
	}
	private List<float> m_averageValues;


	public static void RegisterListener(ISoundReact listener)
	{
		if (Instance) {}

		m_listeners.Add (listener);
	}

	void Awake()
	{
		m_source = gameObject.AddComponent<AudioSource> ();
		m_averageValues = new List<float> ();
	}

	void Start()
	{
		StartCoroutine (RequestMic ());
	}


	IEnumerator RequestMic () {
		yield return Application.RequestUserAuthorization(UserAuthorization.Microphone);



		if (Application.HasUserAuthorization (UserAuthorization.Microphone)) {
		
			Debug.Log("Microphone.devices: " + Microphone.devices.Length);

			m_source.clip = Microphone.Start(null, true, 10, samplerate);
			m_source.loop = true; // Set the AudioClip to loop
			m_source.mute = true; // Mute the sound, we don't want the player to hear it
			while (!(Microphone.GetPosition(Microphone.devices[0]) > 0)){} // Wait until the recording has started
			m_source.Play(); // Play the audio source!
			
			
		}

	}
	

	void Update(){

		if (!m_source.isPlaying)
			return;

		AudioData data = new AudioData ();

		data.loudness = GetAveragedVolume() * sensitivity;
		data.frequence = GetFundamentalFrequency();
		data.spectrum = m_source.GetSpectrumData(1024, 0, FFTWindow.BlackmanHarris);
		data.normalSpectrum = NormalizedSpectrum ();
		data.maxNormalSpectrum = m_maxNormalSpectrum;
		data.averageSpectrum = m_averageSpectrum;

		foreach (ISoundReact s in m_listeners)
			s.AudioHandle (data);

		if(DRAW_SPECTRUM)
			DrawSpectrum ();
	}
	
	float GetAveragedVolume()
	{
		float[] data = new float[256];
		float a = 0;
		GetComponent<AudioSource>().GetOutputData(data,0);
		foreach(float s in data)
		{
			a += Mathf.Abs(s);
		}

		return a/256;
	}


	private float NormalizedSpectrum()
	{
		float[] spectrum = m_source.GetSpectrumData(1024, 0, FFTWindow.BlackmanHarris);
		float value = 0;
		float count = 0;

		for (int i = 0; i < 1024; i++) {
			if(spectrum[i] != 0)
			{
				value += spectrum[i];
				count++;
			}
		}

		value *= 100;


		if (value > m_maxNormalSpectrum)
			m_maxNormalSpectrum = value;

		m_averageValues.Add (value);

		if (m_averageValues.Count > 100)
			m_averageValues.RemoveAt (0);
	

		return value;

	}


	float GetFundamentalFrequency()
	{
		float fundamentalFrequency = 0.0f;
		float[] data = new float[8192];
		m_source.GetSpectrumData(data,0,FFTWindow.BlackmanHarris);
		float s = 0.0f;
		int i = 0;
		for (int j = 1; j < 8192; j++)
		{
			if ( s < data[j] )
			{
				s = data[j];
				i = j;
			}
		}
		fundamentalFrequency = i * samplerate / 8192;
		return fundamentalFrequency;
	}

	private void DrawSpectrum()
	{
		float[] spectrum = GetComponent<AudioSource>().GetSpectrumData(1024, 0, FFTWindow.Rectangular);
		int i = 1;
		while (i < 1023) {
			Debug.DrawLine(new Vector3(i - 1, spectrum[i] + 10, 0), new Vector3(i, spectrum[i + 1] + 10, 0), Color.red);
			Debug.DrawLine(new Vector3(i - 1, Mathf.Log(spectrum[i - 1]) + 10, 2), new Vector3(i, Mathf.Log(spectrum[i]) + 10, 2), Color.cyan);
			Debug.DrawLine(new Vector3(Mathf.Log(i - 1), spectrum[i - 1] - 10, 1), new Vector3(Mathf.Log(i), spectrum[i] - 10, 1), Color.green);
			Debug.DrawLine(new Vector3(Mathf.Log(i - 1), Mathf.Log(spectrum[i - 1]), 3), new Vector3(Mathf.Log(i), Mathf.Log(spectrum[i]), 3), Color.yellow);
			i++;
		}
	}




}


public class AudioData
{
	public float frequence;
	public float loudness;
	public float normalSpectrum;
	public float maxNormalSpectrum;
	public float averageSpectrum;
	public float[] spectrum;
}

public interface ISoundReact
{
	void AudioHandle(AudioData audio);
}